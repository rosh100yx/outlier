import * as ts from 'typescript';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

// Phase 3: Abstract Syntax Tree (AST) Ledger
// This module parses TypeScript/JavaScript files and hashes their structural nodes.
// By hashing the normalized text of structural nodes (like functions, classes, interfaces)
// instead of raw lines, AI authorship survives formatting changes and minor whitespace tweaks.

export interface AstNodeOwnership {
  id: string;          // Cryptographic hash of the structural logic
  nodeType: string;    // e.g. 'FunctionDeclaration', 'ClassDeclaration'
  aiPercent: number;   // 0.0 to 1.0 ownership
}

function hashStructuralNode(nodeText: string, nodeType: string): string {
  // Normalize by stripping all whitespace and comments, to get the pure structural string
  const norm = nodeText.replace(/\s+/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  // Salt with nodeType to prevent generic boilerplate collisions across different syntax kinds
  return createHash('md5').update(`${nodeType}:${norm}`).digest('hex');
}

export function parseAndHashAst(fileName: string, code: string): Map<string, AstNodeOwnership> {
  const map = new Map<string, AstNodeOwnership>();
  if (!fileName.endsWith('.ts') && !fileName.endsWith('.js') && !fileName.endsWith('.tsx') && !fileName.endsWith('.jsx')) {
    return map;
  }

  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true
  );

  function visit(node: ts.Node) {
    // We care about major structural nodes: Functions, Classes, Interfaces, Types
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isArrowFunction(node)
    ) {
      const text = node.getText(sourceFile);
      // Skip trivial nodes
      if (text.length > 20) {
        const nodeType = ts.SyntaxKind[node.kind];
        const hash = hashStructuralNode(text, nodeType);
        map.set(hash, {
          id: hash,
          nodeType: nodeType,
          aiPercent: 0, // Default to 0, later evaluated by evaluator
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return map;
}
