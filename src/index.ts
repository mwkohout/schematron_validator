#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import *  as xmldom from 'xmldom';
import * as xpath from 'xpath';
import * as schematron from 'node-schematron';
import { Pattern } from 'node-schematron/dist/Pattern';

const schematronNs = 'http://purl.oclc.org/dsdl/schematron';


class NamedPattern {
    constructor(patternNodes: Element[]) {
        this.patternNodes = patternNodes;
    }
    patternNodes: Element[];

    validate(instanceDoc: string): boolean {
        const serializer = new xmldom.XMLSerializer();

        // Wrap the pattern in a complete schema structure
        const schemaXml = `
      <schema xmlns="http://purl.oclc.org/dsdl/schematron">
        ${this.patternNodes.map(e => serializer.serializeToString(e)).join("\n")}
      </schema>
    `;

        //   console.log(`Validating instance document against pattern: ${this.name}, pattern: ${instanceNode}`);
        let schematronValidator = schematron.Schema.fromString(schemaXml);
        schematronValidator.namespaces.push({ prefix: 'mei', uri: "http://www.music-encoding.org/ns/mei" });
        // console.log(`Validating instance document against pattern: ${this.name}`);
        // console.log(`Validator: ${JSON.stringify(schematronValidator)}`);
        const results = schematronValidator.validateString(instanceDoc, { debug: true })
        //  console.log(`Validating instance document against pattern: ${this.name}, \nresult: ${results.length} rules found.`);
        return results.every((rule: any) => {
            // console.log(`Rule result: ${JSON.stringify(rule.toJson())}`);
            if (rule.valid) {
                //   console.log(`Rule ${rule.context} is valid.`);
                return true;
            } else {
                console.error(`invalid context: ${JSON.stringify(rule.toJson().context)}, message: ${rule.message}`);
                return false;
            }
        });
    }
}


let program = new Command();
program
    .name('schematron-validator')
    .description('Validate extract Schematron rules from the passed schematron file, and validate an instance document against those rules.')
    .version('1.0.0')
    .argument('<schemaFile>', 'Path to the XML file with Schematron rules')
    .argument('<instanceFile>', 'Path to the instance XML file')

    .action((schemaFilePath: string, instanceFilePath: string) => {

        console.log(`Validating instance document: ${instanceFilePath} against schema: ${schemaFilePath}`);
        const schemaXml = fs.readFileSync(schemaFilePath, 'utf-8');

        const instanceXml = fs.readFileSync(instanceFilePath, 'utf-8');
        const domParser = new xmldom.DOMParser();
        const schemaDoc = domParser.parseFromString(schemaXml, 'application/xml');

        //extract all the schematron rules from the schemaDoc
        const patternNodes = xpath.select(
            "//*[local-name()='pattern' and namespace-uri()='" + schematronNs + "']",
            schemaDoc
        ) as Element[];

        let test = new NamedPattern(patternNodes);



        if (!test.validate(instanceXml)) {

            console.error('Some patterns are invalid.');
            process.exit(1);
        }


    })


program.parse(process.argv);