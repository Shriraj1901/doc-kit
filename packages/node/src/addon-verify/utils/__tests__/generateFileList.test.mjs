import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateFileList } from '../generateFileList.mjs';

describe('generateFileList', () => {
  it('should transform test.js files with updated require paths', () => {
    const codeBlocks = [
      {
        name: 'test.js',
        content: "const addon = require('./build/Release/addon');",
      },
    ];

    const result = generateFileList(codeBlocks);
    const testFile = result.find(file => file.name === 'test.js');

    assert(testFile.content.includes("'use strict';"));
    // The generated file runs inside nodejs/node's `test/addons` tree, where
    // the helper is only reachable via this relative path.
    assert(testFile.content.includes("require('../../common')"));
    assert(testFile.content.includes('`./build/${common.buildType}/addon`'));
    assert(!testFile.content.includes("'./build/Release/addon'"));
  });

  it('should keep the indentation of the original test.js code', () => {
    const content = [
      "const addon = require('./build/Release/addon');",
      '',
      "for (const name of ['a', 'b']) {",
      '  console.log(addon.hello(name));',
      '}',
    ].join('\n');

    const result = generateFileList([{ name: 'test.js', content }]);
    const testFile = result.find(file => file.name === 'test.js');

    assert.equal(
      testFile.content,
      [
        "'use strict';",
        "const common = require('../../common');",
        'const addon = require(`./build/${common.buildType}/addon`);',
        '',
        "for (const name of ['a', 'b']) {",
        '  console.log(addon.hello(name));',
        '}',
      ].join('\n')
    );
  });

  it('should preserve other files unchanged', () => {
    const codeBlocks = [{ name: 'addon.cc', content: '#include <node.h>' }];

    const result = generateFileList(codeBlocks);

    assert.equal(
      result.find(file => file.name === 'addon.cc').content,
      '#include <node.h>'
    );
  });

  it('should add binding.gyp file', () => {
    const codeBlocks = [{ name: 'addon.cc', content: 'code' }];

    const result = generateFileList(codeBlocks);
    const bindingFile = result.find(file => file.name === 'binding.gyp');

    assert(bindingFile);
    const config = JSON.parse(bindingFile.content);
    assert.equal(config.targets[0].target_name, 'addon');
    assert(config.targets[0].sources.includes('addon.cc'));
  });

  it('should handle empty input', () => {
    const result = generateFileList([]);

    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'binding.gyp');
  });
});
