import * as ts from 'typescript';
import type { CompilerOptionValues, TargetOption } from '../settings/compilerOptions';

// This uses the real `typescript` package's full enums (unlike Monaco's trimmed ones — see ADR
// 0007), but is still restricted to the curated option set so behavior matches what the user saw
// in the editor's live diagnostics.
const TARGET_MAP: Record<TargetOption, ts.ScriptTarget> = {
  ES5: ts.ScriptTarget.ES5,
  ES2015: ts.ScriptTarget.ES2015,
  ES2017: ts.ScriptTarget.ES2017,
  ES2019: ts.ScriptTarget.ES2019,
  ES2020: ts.ScriptTarget.ES2020,
  ESNext: ts.ScriptTarget.ESNext,
};

export interface TranspileResult {
  code: string;
  diagnostics: string[];
}

/**
 * Rewrites curated package specifiers (`'zod'`) to their full esm.sh URLs in the emitted code.
 * User code runs inside a Web Worker (ADR 0013), and import maps don't apply in workers, so the
 * bare specifier can't be resolved at runtime the way the old iframe-level import map did.
 * Registered as an `after` transformer so TypeScript's own import elision (type-only and unused
 * imports) has already run — rewriting earlier would hand it nodes it no longer recognizes.
 */
function rewritePackageSpecifiers(
  packageUrls: Record<string, string>,
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const { factory } = context;
    const rewrite = (specifier: ts.Expression | undefined) =>
      specifier && ts.isStringLiteral(specifier) && Object.hasOwn(packageUrls, specifier.text)
        ? factory.createStringLiteral(packageUrls[specifier.text])
        : undefined;

    const visit = (node: ts.Node): ts.Node => {
      if (ts.isImportDeclaration(node)) {
        const url = rewrite(node.moduleSpecifier);
        if (url) {
          return factory.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            url,
            node.attributes,
          );
        }
      } else if (ts.isExportDeclaration(node)) {
        const url = rewrite(node.moduleSpecifier);
        if (url) {
          return factory.updateExportDeclaration(
            node,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            url,
            node.attributes,
          );
        }
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const [first, ...rest] = node.arguments;
        const url = rewrite(first);
        if (url) {
          return factory.updateCallExpression(node, node.expression, node.typeArguments, [
            url,
            ...rest,
          ]);
        }
      }
      return ts.visitEachChild(node, visit, context);
    };

    return (sourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
  };
}

/**
 * Transpile-only (no type-checking — real diagnostics come from Monaco's live squiggles); the
 * diagnostics returned here are only the syntactic errors `transpileModule` happens to surface.
 */
export function transpileSource(
  source: string,
  options: CompilerOptionValues,
  packageUrls: Record<string, string>,
): TranspileResult {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      // Fixed regardless of user choice — see ADR 0007. Execution hard-requires ESM output.
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
      target: TARGET_MAP[options.target],
      strict: options.strict,
      esModuleInterop: options.esModuleInterop,
      experimentalDecorators: options.experimentalDecorators,
      noUnusedLocals: options.noUnusedLocals,
      noUnusedParameters: options.noUnusedParameters,
    },
    reportDiagnostics: true,
    transformers: { after: [rewritePackageSpecifiers(packageUrls)] },
  });

  return {
    code: result.outputText,
    diagnostics: (result.diagnostics ?? []).map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    ),
  };
}
