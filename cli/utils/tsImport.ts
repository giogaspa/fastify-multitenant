// @ts-nocheck
import { readFileSync } from 'fs'

import ts from 'typescript'

function transpile(filePath: string) {
  const file = readFileSync(filePath);
  const result = ts.transpileModule(file.toString(), { compilerOptions: { module: ts.ModuleKind.CommonJS } });

  return result.outputText
}

export async function tsImport(filePath: string) {
  // Compile TS file
  const result = transpile(filePath);

  //Create virtual module
  var Module = module.constructor;
  var m = new Module();
  m._compile(result, '');
  return m.exports;
}