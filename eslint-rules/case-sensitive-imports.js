import fs from "node:fs";
import path from "node:path";

const extensions = [
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
];

const caseSensitiveImports = {
  meta: {
    type: "problem",
    docs: {
      description: "Require local import paths to match file-name casing",
    },
    messages: {
      incorrectCase:
        'Import "{{specifier}}" has incorrect casing for "{{requestedSegment}}"; the file system uses "{{actualName}}".',
    },
    schema: [],
  },
  create(context) {
    const filename = context.physicalFilename ?? context.filename;

    const checkImportPath = (node, rawSpecifier) => {
      if (typeof rawSpecifier !== "string" || !rawSpecifier.startsWith(".")) {
        return;
      }

      const specifier = rawSpecifier.split(/[?#]/, 1)[0];
      const targetPath = path.resolve(path.dirname(filename), specifier);
      const segments = path.relative(path.parse(targetPath).root, targetPath)
        .split(path.sep)
        .filter(Boolean);
      let currentPath = path.parse(targetPath).root;

      for (let index = 0; index < segments.length; index += 1) {
        const requestedSegment = segments[index];
        let entries;

        try {
          entries = fs.readdirSync(currentPath);
        } catch {
          return;
        }

        if (entries.includes(requestedSegment)) {
          currentPath = path.join(currentPath, requestedSegment);
          continue;
        }

        const isLastSegment = index === segments.length - 1;
        const expectedNames = isLastSegment
          ? [requestedSegment, ...extensions.map((extension) => `${requestedSegment}${extension}`)]
          : [requestedSegment];
        const actualName = entries.find((entry) =>
          expectedNames.some(
            (expectedName) => expectedName.toLowerCase() === entry.toLowerCase(),
          ),
        );

        if (!actualName) return;

        const requestedName = expectedNames.find(
          (expectedName) => expectedName.toLowerCase() === actualName.toLowerCase(),
        );

        if (requestedName !== actualName) {
          context.report({
            node,
            messageId: "incorrectCase",
            data: {
              specifier: rawSpecifier,
              requestedSegment,
              actualName,
            },
          });
        }
        currentPath = path.join(currentPath, actualName);
      }

      try {
        if (!fs.statSync(currentPath).isDirectory()) return;
        const entries = fs.readdirSync(currentPath);
        const expectedIndexes = ["index", ...extensions.map((extension) => `index${extension}`)];
        const actualIndex = entries.find((entry) =>
          expectedIndexes.some(
            (expectedName) => expectedName.toLowerCase() === entry.toLowerCase(),
          ),
        );
        if (!actualIndex) return;

        const expectedIndex = expectedIndexes.find(
          (expectedName) => expectedName.toLowerCase() === actualIndex.toLowerCase(),
        );
        if (expectedIndex !== actualIndex) {
          context.report({
            node,
            messageId: "incorrectCase",
            data: {
              specifier: rawSpecifier,
              requestedSegment: "index",
              actualName: actualIndex,
            },
          });
        }
      } catch {
        // A missing path is handled by the normal import resolver or runtime.
      }
    };

    return {
      ImportDeclaration(node) {
        checkImportPath(node, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) checkImportPath(node, node.source.value);
      },
      ExportAllDeclaration(node) {
        checkImportPath(node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === "Literal") {
          checkImportPath(node, node.source.value);
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments[0]?.type === "Literal"
        ) {
          checkImportPath(node, node.arguments[0].value);
        }
      },
    };
  },
};

export default caseSensitiveImports;
