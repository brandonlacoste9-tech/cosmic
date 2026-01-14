// backend/agents/SyntaxValidator.js
// Lightweight TypeScript/JSX syntax validator - pre-write guard

import ts from 'typescript';

export class SyntaxValidator {
    /**
     * Validate a TypeScript/JSX file string WITHOUT actually emitting files.
     * Returns { valid: boolean, diagnostics: string[] }
     */
    static validate(code, fileName = 'temp.tsx') {
        try {
            // Create a virtual source file
            const sourceFile = ts.createSourceFile(
                fileName,
                code,
                ts.ScriptTarget.Latest,
                true,
                fileName.endsWith('.tsx') || fileName.endsWith('.jsx') 
                    ? ts.ScriptKind.TSX 
                    : ts.ScriptKind.TS
            );

            // Collect syntax errors (parsing phase only - fast)
            const diagnostics = [];
            
            // Check for parse errors in the source file
            const syntaxErrors = sourceFile.parseDiagnostics || [];
            
            for (const diag of syntaxErrors) {
                if (diag.start !== undefined) {
                    const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start);
                    const msg = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
                    diagnostics.push(`Line ${line + 1}, Col ${character + 1}: ${msg}`);
                }
            }

            // Additional quick check: try to parse as a module
            if (diagnostics.length === 0) {
                // If no syntax errors, do a quick semantic check
                const compilerOptions = {
                    noEmit: true,
                    allowJs: true,
                    jsx: ts.JsxEmit.React,
                    target: ts.ScriptTarget.ESNext,
                    module: ts.ModuleKind.ESNext,
                    moduleResolution: ts.ModuleResolutionKind.NodeJs,
                    esModuleInterop: true,
                    skipLibCheck: true
                };

                const host = ts.createCompilerHost(compilerOptions);
                const originalGetSourceFile = host.getSourceFile;
                
                host.getSourceFile = (name, languageVersion) => {
                    if (name === fileName) {
                        return sourceFile;
                    }
                    return originalGetSourceFile.call(host, name, languageVersion);
                };

                host.fileExists = (name) => name === fileName;
                host.readFile = (name) => name === fileName ? code : undefined;

                const program = ts.createProgram([fileName], compilerOptions, host);
                const semanticDiagnostics = program.getSyntacticDiagnostics(sourceFile);

                for (const diag of semanticDiagnostics) {
                    if (diag.start !== undefined) {
                        const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start);
                        const msg = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
                        diagnostics.push(`Line ${line + 1}, Col ${character + 1}: ${msg}`);
                    }
                }
            }

            return {
                valid: diagnostics.length === 0,
                diagnostics: diagnostics
            };

        } catch (error) {
            // If TypeScript itself crashes, treat as invalid
            return {
                valid: false,
                diagnostics: [`Validator error: ${error.message}`]
            };
        }
    }

    /**
     * Quick check - just verifies basic syntax without full compilation
     */
    static quickCheck(code, fileName = 'temp.tsx') {
        try {
            ts.createSourceFile(
                fileName,
                code,
                ts.ScriptTarget.Latest,
                true,
                ts.ScriptKind.TSX
            );
            return { valid: true, diagnostics: [] };
        } catch (error) {
            return { valid: false, diagnostics: [error.message] };
        }
    }
}

export default SyntaxValidator;
