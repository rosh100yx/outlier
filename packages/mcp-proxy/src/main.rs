use rayon::prelude::*;
use serde::Deserialize;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Default)]
struct TokenStats {
    prompt_tokens: u64,
    output_tokens: u64,
    cache_read_tokens: u64,
}

#[derive(Deserialize)]
struct ClaudeMessageUsage {
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    cache_creation_input_tokens: Option<u64>,
    cache_read_input_tokens: Option<u64>,
}

#[derive(Deserialize)]
struct ClaudeMessage {
    role: Option<String>,
    usage: Option<ClaudeMessageUsage>,
}

#[derive(Deserialize)]
struct ClaudeLog {
    message: Option<ClaudeMessage>,
}

fn claude_project_slug(cwd: &str) -> String {
    let mut s = cwd.replace('/', "-");
    if s.starts_with('-') {
        s.remove(0);
    }
    s
}

fn parse_claude_logs(base_dir: &Path, cwd: &str) -> TokenStats {
    let mut stats = TokenStats::default();
    let slug = claude_project_slug(cwd);
    let claude_dir = base_dir.join(".claude").join("projects").join(slug);
    
    if !claude_dir.exists() {
        return stats;
    }

    let jsonl_files: Vec<PathBuf> = WalkDir::new(claude_dir)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "jsonl"))
        .map(|e| e.path().to_path_buf())
        .collect();

    let file_stats: Vec<TokenStats> = jsonl_files
        .par_iter()
        .map(|file| {
            let mut local_stats = TokenStats::default();
            if let Ok(content) = fs::read_to_string(file) {
                for line in content.lines() {
                    if line.trim().is_empty() { continue; }
                    if let Ok(log) = serde_json::from_str::<ClaudeLog>(line) {
                        if let Some(msg) = log.message {
                            if let Some(usage) = msg.usage {
                                local_stats.output_tokens += usage.output_tokens.unwrap_or(0);
                                local_stats.prompt_tokens += usage.input_tokens.unwrap_or(0) + usage.cache_creation_input_tokens.unwrap_or(0);
                                local_stats.cache_read_tokens += usage.cache_read_input_tokens.unwrap_or(0);
                            }
                        }
                    }
                }
            }
            local_stats
        })
        .collect();

    for s in file_stats {
        stats.prompt_tokens += s.prompt_tokens;
        stats.output_tokens += s.output_tokens;
        stats.cache_read_tokens += s.cache_read_tokens;
    }

    stats
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let cwd = if args.len() > 1 {
        args[1].clone()
    } else {
        env::current_dir().unwrap_or_default().to_string_lossy().to_string()
    };

    if let Some(home_dir) = dirs::home_dir() {
        let claude_stats = parse_claude_logs(&home_dir, &cwd);
        
        let out = serde_json::json!({
            "claude": {
                "outputTokens": claude_stats.output_tokens,
                "promptTokens": claude_stats.prompt_tokens,
                "cacheReadTokens": claude_stats.cache_read_tokens,
            }
        });
        
        println!("{}", out.to_string());
    } else {
        println!("{}", serde_json::json!({"error": "No home dir"}).to_string());
    }
}
