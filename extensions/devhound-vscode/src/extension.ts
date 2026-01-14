import * as vscode from 'vscode';
import { NeuralBridgeClient } from './client';

export function activate(context: vscode.ExtensionContext) {
  const client = new NeuralBridgeClient();
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('devhound');

  // 1. Status Bar Item
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.text = "$(telescope) DevHound";
  statusBar.tooltip = "Neural Bridge Connected";
  statusBar.command = "devhound.scanFile";
  statusBar.show();

  // 2. Command: Scan Current File
  const scanFile = vscode.commands.registerCommand('devhound.scanFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "DevHound: Analyzing...",
        cancellable: false
      }, async () => {
        try {
          const result = await client.scanFile(editor.document.fileName);
          
          diagnosticCollection.clear();
          
          if (result.issues && result.issues.length > 0) {
            const diags: vscode.Diagnostic[] = [];
            
            result.issues.forEach((issue: any) => {
               // Create a Diagnostic for the top of the file
               const range = new vscode.Range(0, 0, 0, 1);
               const diagnostic = new vscode.Diagnostic(
                 range, 
                 `[Ralph Loop] ${issue.message}`, 
                 vscode.DiagnosticSeverity.Warning
               );
               diagnostic.source = 'DevHound';
               diagnostic.code = 'ai-repair';
               diags.push(diagnostic);
               
               // Store the fix in a map or context if needed? 
               // For now, prompt user immediately.
            });

            diagnosticCollection.set(editor.document.uri, diags);
            
            const selection = await vscode.window.showWarningMessage(
                `DevHound found issues: ${result.issues[0].message.substring(0, 50)}...`,
                "View Fix", "Apply Fix"
            );
            
            if (selection === "Apply Fix") {
                const fix = result.issues[0].fix;
                const fullRange = new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(editor.document.getText().length)
                );
                await editor.edit(editBuilder => {
                    editBuilder.replace(fullRange, fix);
                });
                vscode.window.showInformationMessage("✅ AI Fix Applied");
                diagnosticCollection.clear();
            }

          } else {
            vscode.window.showInformationMessage('✅ DevHound: No issues found.');
          }

        } catch (error: any) {
          vscode.window.showErrorMessage(`Neural Bridge Error: ${error.message}`);
        }
      });
  });

  // 3. Command: Trigger Server-Side Fix
  const fixFile = vscode.commands.registerCommand('devhound.triggerFix', async () => {
       const editor = vscode.window.activeTextEditor;
       if (!editor) return;
       
       try {
           await client.fixFile(editor.document.fileName);
           vscode.window.showInformationMessage("⚡ Ralph Loop Triggered (Watch for updates)");
       } catch (error: any) {
           vscode.window.showErrorMessage(`Fix Failed: ${error.message}`);
       }
  });

  // 4. Auto-fix on Save
  const onSave = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    const config = vscode.workspace.getConfiguration('devhound');
    if (!config.get('autoFixOnSave')) return;
    
    // Only run on relevant files
    if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(doc.languageId)) {
        await client.fixFile(doc.fileName);
    }
  });

  context.subscriptions.push(scanFile, fixFile, statusBar, onSave, diagnosticCollection);
}

export function deactivate() {}
