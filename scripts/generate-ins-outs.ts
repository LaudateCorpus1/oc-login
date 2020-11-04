
// Run with 'npm run generate-ins-outs'
// Use 'npm run generate-ins-outs -- $outFile' to change the output file path

// The intent of this script is to automate building enums for the action's inputs and outputs.
// This way, we can be sure the action.yml matches the input and output names
// that the action implementation expects.

import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import * as jsYaml from "js-yaml";

type InputOrOutput = Readonly<{
    description: string;
    required: boolean;
}>

type InputsOutputs = Readonly<{
    [key: string]: InputOrOutput;
}>

type ActionYml = Readonly<{
    name: string;
    description: string;
    inputs: InputsOutputs;
    outputs: InputsOutputs;
    runs: {
        using: string;
        main: string;
    };
}>

async function loadActionYml(): Promise<ActionYml> {
    const actionYmlFile = path.resolve(__dirname, "..", "action.yml");

    const actionYmlContents = (await promisify(fs.readFile)(actionYmlFile)).toString();
    const actionYmlRaw = jsYaml.safeLoad(actionYmlContents);

    if (actionYmlRaw == null) {
        throw new Error(`Action yaml load returned ${actionYmlRaw}`);
    }

    return actionYmlRaw as ActionYml;
}

function enumify(enumName: string, inputsOrOutputs: [string, InputOrOutput][]) {
    inputsOrOutputs.sort();

    const OUTPUT_INDENT = " ".repeat(4);

    return inputsOrOutputs.reduce((inputsBuilder: string, [name, props]) => {
        inputsBuilder += `${OUTPUT_INDENT}// ${props.description.trim().replace("\\n", " ")}\n`;
        inputsBuilder += `${OUTPUT_INDENT}${name.toUpperCase()} = "${name}",\n`
        return inputsBuilder;
    }, `export enum ${enumName} {\n`) + `}\n`;
}

(async function() {
    const actionYml = await loadActionYml();

    const inputs = Object.entries(actionYml.inputs || []);
    const outputs = Object.entries(actionYml.outputs || []);

    console.log(`Found ${inputs.length} inputs and ${outputs.length} outputs.`);

    let outputFileContents =
`/*************************************************************************************************
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 **************************************************************************************************/

///// This file is auto-generated by ${path.relative("..", __filename)} - Do not edit by hand!

`;
    outputFileContents += enumify("Inputs", inputs);
    outputFileContents += `\n`;
    outputFileContents += enumify("Outputs", outputs);

    let outputFile = process.argv[2];
    if (!outputFile) {
        outputFile = path.resolve(__dirname, "..", "src", "generated", "inputs-outputs.ts");
    }

    console.log(`Outputting inputs and outputs to ${outputFile}`);
    await promisify(fs.writeFile)(outputFile, outputFileContents);
})()
.then(() => {
    console.log(`Success`);
})
.catch((err) => {
    console.error(err);
    process.exit(1);
});
