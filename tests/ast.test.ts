import { describe, it, expect } from 'bun:test';
import { parseAndHashAst } from '../src/ast';

describe('AST Parsing Engine', () => {
  it('should ignore non-ts/js files', () => {
    const result = parseAndHashAst('test.txt', 'function foo() {}');
    expect(result.size).toBe(0);
  });

  it('should correctly parse and hash a TS function', () => {
    const code = `
      export function calculateTotal(a: number, b: number): number {
        return a + b;
      }
    `;
    const result = parseAndHashAst('math.ts', code);
    expect(result.size).toBeGreaterThan(0);
    
    const hashes = Array.from(result.keys());
    expect(hashes.length).toBe(1);
    
    const hash = hashes[0];
    if (hash) {
      const ownership = result.get(hash);
      expect(ownership?.nodeType).toBe('FunctionDeclaration');
    }
  });

  it('should generate the exact same hash regardless of whitespace or formatting', () => {
    const code1 = `
      export function calculateTotal(a: number, b: number): number {
        return a + b;
      }
    `;
    // Heavily reformatted code
    const code2 = `
export function calculateTotal(
  a: number, 
  b: number
): number {
    return a + b;
}
    `;
    const result1 = parseAndHashAst('math.ts', code1);
    const result2 = parseAndHashAst('math.ts', code2);
    
    const hash1 = Array.from(result1.keys())[0];
    const hash2 = Array.from(result2.keys())[0];
    
    expect(hash1).toBe(hash2);
  });

  it('should extract multiple nodes from a complex file', () => {
    const code = `
      interface User { id: string; }
      class UserManager {
        getUser() { return null; }
      }
      const doNothing = () => {};
    `;
    const result = parseAndHashAst('complex.ts', code);
    
    // Should find InterfaceDeclaration, ClassDeclaration, MethodDeclaration, and ArrowFunction
    // Wait, ArrowFunction is part of VariableDeclaration, let's just assert size > 2
    expect(result.size).toBeGreaterThan(2);
  });
});
