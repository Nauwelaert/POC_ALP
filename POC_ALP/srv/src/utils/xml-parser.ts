import * as fs from "fs";
import { parseStringPromise, Builder } from "xml2js";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { logger } from "./logger";

/**
 * Interface representing the result of XML validation
 */
interface ValidationResult {
  /** Whether the XML is valid */
  isValid: boolean;
  /** Error message if validation failed, undefined if successful */
  error?: string;
}

/**
 * Extracts the last segment of each path from an array of file or directory paths.
 *
 * This function processes each path in the input array and returns the part of the path
 * after the last `/` (slash). If the path does not contain a `/`, the entire path is returned.
 *
 * @param {string[]} paths - An array of file or directory paths represented as strings.
 * @returns {string[]} - A new array containing the last segment of each path.
 *
 * @example
 * // Example usage of extractLastSegments
 * const paths = ['/home/user/file1.txt', '/home/user/file2.txt', 'file3.txt'];
 * const segments = extractLastSegments(paths);
 * console.log(segments); // Outputs: ['file1.txt', 'file2.txt', 'file3.txt']
 */

export const extractLastSegments = (paths: string[]): string[] =>
  paths.map((path) => {
    const lastSlashIndex = path.lastIndexOf("/");
    return lastSlashIndex !== -1 ? path.substring(lastSlashIndex + 1) : path;
  });

/**
 * Recursively searches an object or array for annotations and collects them into an array.
 *
 * This function traverses through an object or array and collects all objects that contain
 * a `Target` property within a `$` object and an `Annotation` property. It recursively explores
 * nested objects and arrays, ensuring all relevant annotations are found.
 *
 * @param {any} obj - The object or array to search for annotations. This can be any JavaScript value.
 * @returns {any[]} - An array containing all found annotations that meet the criteria.
 *
 * @example
 * // Example usage of findAllAnnotations
 * const data = {
 *     $: { Target: 'someTarget' },
 *     Annotation: 'someAnnotation',
 *     nested: { $: { Target: 'anotherTarget' }, Annotation: 'anotherAnnotation' }
 * };
 * const annotations = findAllAnnotations(data);
 * console.log(annotations); // Outputs: [{ $: { Target: 'someTarget' }, Annotation: 'someAnnotation' }, { $: { Target: 'anotherTarget' }, Annotation: 'anotherAnnotation' }]
 */

const findAllAnnotations = (obj: any): any[] => {
  const results: any[] = [];

  if (Array.isArray(obj)) {
    obj.forEach((item) => results.push(...findAllAnnotations(item)));
  } else if (obj && typeof obj === "object") {
    if (obj.$?.Target && obj.Annotation) {
      results.push(obj);
    }

    Object.values(obj).forEach((value) => {
      if (value && typeof value === "object") {
        results.push(...findAllAnnotations(value));
      }
    });
  }

  return results;
};

/**
 * Filters Annotations elements that have "/_0" in their Target attribute and do not have
 * a child Annotation element with Term="Common.Label". Returns an array of matching Target names.
 *
 * This function searches for Annotations elements throughout the entire XML document,
 * not just in the first Schema element. It handles multiple Schema elements and Annotations
 * that might be located in different parts of the document.
 *
 * @param xmlContent - The XML content to process as a string
 * @returns Promise<string[]> - Array of Target names that match the criteria
 * @throws Error if XML parsing fails or if the document structure is invalid
 */

export const filterTargetsWithoutLabel = async (xmlContent: string): Promise<string[]> => {
  try {
    if (!xmlContent || typeof xmlContent !== "string") {
      throw new Error("Invalid XML content provided");
    }

    const parsed = await parseStringPromise(xmlContent);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Failed to parse XML content");
    }

    const result: string[] = [];
    const allAnnotations = findAllAnnotations(parsed);

    allAnnotations.forEach((annotationsElement) => {
      const target = annotationsElement.$?.Target;
      if (!target || !target.includes("/_0")) return;

      const annotations = Array.isArray(annotationsElement.Annotation) ? annotationsElement.Annotation : [annotationsElement.Annotation];

      const hasCommonLabel = annotations.some((ann: { $: { Term: string } }) => ann?.$?.Term === "Common.Label");

      if (!hasCommonLabel) result.push(target);
    });

    return result;
  } catch (error) {
    throw new Error(`Error filtering XML: ${(error as Error).message || "Unknown error"}`);
  }
};

/**
 * Validates XML content for well-formedness and correct syntax.
 *
 * @param input - The XML content to validate. Can be either a string containing XML
 *                or a JavaScript object representing parsed XML.
 * @returns A ValidationResult object containing the validation status and any error message
 *
 * @example
 * // Validate XML string
 * const result = validateXML('<root><child>value</child></root>');
 * if (result.isValid) {
 *     console.log('XML is valid');
 * } else {
 *     console.error('XML validation failed:', result.error);
 * }
 *
 * @example
 * // Validate XML object
 * const obj = {
 *     root: {
 *         child: 'value'
 *     }
 * };
 * const result = validateXML(obj);
 */

export const validateXML = (input: string | object): ValidationResult => {
  try {
    if (typeof input === "object") {
      const builder = new Builder();
      input = builder.buildObject(input);
    }

    const validationResult = XMLValidator.validate(input);

    return validationResult === true ? { isValid: true } : { isValid: false, error: validationResult.err.msg };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown validation error",
    };
  }
};

/**
 * Recursively removes obsolete elements from an object or array.
 *
 * This function processes each element of the input object or array, and removes those that
 * are labeled as obsolete. Specifically, it checks if an element has a `$` property with a
 * `Term` of "Common.Label" and a `String` property that starts with "(obsolete)". These elements
 * are removed from the structure. The function works recursively, processing nested objects or arrays.
 *
 * @param {any} obj - The object or array to process. This can be any JavaScript value.
 * @returns {Promise<any>} - A Promise that resolves to the modified object or array with obsolete elements removed.
 *
 * @example
 * // Example usage of removeObsolete
 * const data = {
 *     $: { Term: 'Common.Label' },
 *     String: '(obsolete) Example',
 *     nested: { $: { Term: 'Common.Label' }, String: '(obsolete) Nested' }
 * };
 * const cleanData = await removeObsolete(data);
 * console.log(cleanData); // Outputs: {} (obsolete elements are removed)
 */

export const removeObsolete = async (obj: any): Promise<any> => {
  if (Array.isArray(obj)) {
    const results = await Promise.all(obj.map(removeObsolete));
    return results.filter(Boolean);
  }

  if (typeof obj === "object" && obj !== null) {
    if (obj.$?.Term === "Common.Label" && obj.$.String?.startsWith("(obsolete)")) {
      return null;
    }

    const entries = await Promise.all(Object.entries(obj).map(async ([key, value]) => [key, await removeObsolete(value)]));

    entries.forEach(([key, value]) => (obj[key] = value));
  }

  return obj;
};

/**
 * Recursively removes elements with names starting with an underscore from an object or array.
 *
 * This function processes each element of the input object or array and removes those elements
 * whose `$` property contains a `Name` that starts with an underscore ("_"). The function works recursively
 * through nested objects and arrays, ensuring that all relevant elements are removed.
 *
 * @param {any} obj - The object or array to process. This can be any JavaScript value.
 * @returns {Promise<any>} - A Promise that resolves to the modified object or array with elements removed.
 *
 * @example
 * // Example usage of removeUnderscores
 * const data = {
 *     $: { Name: '_example' },
 *     nested: { $: { Name: '_nestedExample' }, value: 'data' }
 * };
 * const cleanData = await removeUnderscores(data);
 * console.log(cleanData); // Outputs: { nested: { value: 'data' } } (elements with underscores are removed)
 */

export const removeUnderscores = async (obj: any): Promise<any> => {
  if (Array.isArray(obj)) {
    const results = await Promise.all(obj.map(removeUnderscores));
    return results.filter(Boolean);
  }

  if (typeof obj === "object" && obj !== null) {
    if (obj.$?.Name?.startsWith("_")) {
      return null;
    }

    const entries = await Promise.all(Object.entries(obj).map(async ([key, value]) => [key, await removeUnderscores(value)]));

    entries.forEach(([key, value]) => (obj[key] = value));
  }

  return obj;
};

/**
 * Replaces all occurrences of `Path="0"` with `Path="_0"` in XML string annotations.
 *
 * This function searches the provided XML string for `<Annotation>` elements that contain
 * `Path="0"`, and replaces them with `Path="_0"`. It modifies the XML string by updating
 * the specified attribute, ensuring that any `Path="0"` is converted to `Path="_0"`.
 *
 * @param {string} xml - The XML string in which to replace occurrences of `Path="0"`.
 * @returns {string} - A new XML string with the modified `Path` attributes.
 *
 * @example
 * const xmlContent = '<Annotation Path="0"><Value>Some Value</Value></Annotation>';
 * const modifiedXml = replaceZeroInPath(xmlContent);
 * console.log(modifiedXml); // Outputs: <Annotation Path="_0"><Value>Some Value</Value></Annotation>
 */

export const replaceZeroInPath = (xml: string): string => xml.replace(/(<Annotation[^>]*Path=")0/g, "$1_0");

/**
 * Cleans an XML string by performing several transformation steps, including:
 * 1. Replacing zero values in paths with "_0".
 * 2. Removing properties with names starting with an underscore.
 * 3. Parsing the XML to a JavaScript object.
 * 4. Removing obsolete annotations and underscore-prefixed elements.
 * 5. Converting the cleaned object back to an XML string.
 *
 * @param {string} xml - The XML string to be cleaned.
 * @returns {Promise<string>} A promise that resolves to the cleaned XML string.
 *
 * @throws {Error} Throws an error if any of the cleaning steps fail.
 *
 * @example
 * // Example usage:
 * cleanXML('<xml>...</xml>')
 *     .then(cleanedXml => console.log(cleanedXml))
 *     .catch(err => console.error('Error:', err));
 */

export const cleanXML = async (xmlContent: string): Promise<string> => {
  try {
    // First replace zero in paths in the raw XML string
    const xmlWithFixedPaths = replaceZeroInPath(xmlContent);

    // Remove properties starting with an underscore in their name
    // this was too drastic !! Too many fields removed.
    // const removePropertiesStartingWithUnderscoreInName = removePropertiesWithUnderscoreName(xmlWithFixedPaths);

    const xmlWithoutPrimarykeys = await removePrimarykeys(xmlWithFixedPaths);

    // Parse XML to JS object
    const parsedXml = await parseStringPromise(xmlWithoutPrimarykeys);

    // Remove obsolete annotations and underscore-prefixed elements
    const cleaned = await removeObsolete(parsedXml);

    // Convert back to XML
    const builder = new Builder();
    return builder.buildObject(cleaned);
  } catch (error) {
    throw new Error(`Error cleaning XML: ${error}`);
  }
};

/**
 * Removes `Property` elements with specific `Name` attributes from the provided XML string.
 * The `Name` attributes that are to be removed are specified in the `namesToRemove` array.
 *
 * @param {string} xmlContent - The XML content as a string to process.
 * @param {string[]} namesToRemove - An array of `Name` attribute values. `Property` elements
 *                                    with these `Name` values will be removed.
 * @returns {string} The modified XML string with the specified `Property` elements removed.
 *
 * @example
 * const xml = '<Property Name="Item1"/>\n<Property Name="Item2"/>';
 * const namesToRemove = ['Item1'];
 * const result = removePropertyNodeByName(xml, namesToRemove);
 * console.log(result); // '<Property Name="Item2"/>'
 */

export const removePropertyNodeByName = (xmlContent: string, namesToRemove: string[]): string => {
  const removeSet = new Set(namesToRemove);
  return xmlContent
    .split("\n")
    .filter((line, index, lines) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("<Property")) {
        const nameMatch = trimmedLine.match(/Name="([^"]+)"/);
        if (nameMatch && removeSet.has(nameMatch[1])) {
          return false;
        }
      }
      return trimmedLine.length > 0 || (index > 0 && index < lines.length - 1);
    })
    .join("\n");
};

/**
 * Removes all Property elements with a Name attribute starting with an underscore ("_") from the provided XML content.
 *
 * This function searches the provided XML string for `<Property>` elements with a `Name` attribute
 * that begins with an underscore (`_`). These matching elements are then removed from the XML string.
 * The function uses a regular expression to identify and replace these elements.
 *
 * @param {string} xmlContent - The XML content to process.
 * @returns {string} - The modified XML content with the specified Property elements removed.
 *
 * @example
 * const originalXML = '<Property Name="_example" /> <Property Name="valid" />';
 * const cleanedXML = removePropertiesWithUnderscoreName(originalXML);
 * console.log(cleanedXML); // Outputs '<Property Name="valid" />'
 */
export const removePropertiesWithUnderscoreName = (xmlContent: string): string => xmlContent.replace(/<Property[^>]*\sName="_[^"]*"[^>]*\/>/g, "");

/**
 * Removes unnecessary annotations from an XML string based on specific conditions.
 *
 * This function parses the given XML string into a JavaScript object, filters out annotations
 * that do not meet certain criteria, and returns the modified XML string. The criteria for
 * keeping annotations are that they must have a term of "Analytics.Dimension" and a Bool
 * value of "true". If annotations don't meet these conditions, they are removed.
 *
 * @param {string} xmlString - The XML content to be processed. It should be a valid XML string.
 * @returns {Promise<string>} - A promise that resolves to the modified XML string, where unnecessary
 *                               annotations have been removed.
 *
 * @throws {Error} - Throws an error if the XML parsing or processing fails.
 *
 * @example
 * // Example usage of removePrimaryAnnotations
 * const xmlInput = '<Annotations><Property Name="example"/><Annotation Term="Analytics.Dimension" Bool="true"/></Annotations>';
 * removePrimaryAnnotations(xmlInput).then(modifiedXml => {
 *     console.log(modifiedXml); // Outputs the XML string with filtered annotations
 * }).catch(err => {
 *     console.error('Error:', err);
 * });
 */

export const removePrimarykeyAnnotations = async (xmlString: string): Promise<string> => {
  try {
    const parsed = await parseStringPromise(xmlString);

    const shouldKeepAnnotations = (annotations: { $: { Target: any }; Annotation: any }): boolean => {
      if (!annotations.$?.Target || !annotations.Annotation) return false;

      const annotationsArray = Array.isArray(annotations.Annotation) ? annotations.Annotation : [annotations.Annotation];

      return annotationsArray.some((ann: { $: { Term: string; Bool: string } }) => ann.$?.Term === "Analytics.Dimension" && ann.$.Bool === "true");
    };

    if (parsed.Annotations) {
      if (Array.isArray(parsed.Annotations)) {
        parsed.Annotations = parsed.Annotations.filter(shouldKeepAnnotations);
      } else if (!shouldKeepAnnotations(parsed.Annotations)) {
        delete parsed.Annotations;
      }
    }

    return new Builder().buildObject(parsed);
  } catch (error) {
    throw new Error(`Error processing XML: ${error}`);
  }
};

/**
 * Reads an XML file, cleans its content using the `cleanXML` function,
 * and writes the cleaned XML to an output file.
 *
 * @param {string} inputFile - The path to the input XML file to be cleaned.
 * @param {string} outputFile - The path to the output file where the cleaned XML will be saved.
 *
 * @returns {Promise<void>} A promise that resolves when the cleaning process is complete
 * and the cleaned XML is written to the output file.
 *
 * @example
 * // Example usage:
 * cleanXMLFile('input.xml', 'output.xml')
 *     .then(() => console.log('File processed successfully'))
 *     .catch(err => console.error('Error:', err));
 */

export const cleanXMLFile = async (inputFile: string, outputFile: string): Promise<void> => {
  try {
    // Read XML file
    const xmlData = ReadXMLFile(inputFile);

    // Clean the XML using the cleanXML function
    const cleanedXml = await cleanXML(xmlData);

    // Write to output file
    WriteXMLFile(outputFile, cleanedXml);

    console.log(`Successfully written cleaned XML to ${outputFile}`);
  } catch (error) {
    console.error("Error processing XML file:", error);
  }
};

/**
 * Asynchronously removes primary key properties from the given XML content.
 *
 * This function identifies and removes XML property nodes whose names match
 * a specific pattern ("/_0") and lack a `Common.Label`. It first filters
 * the relevant targets, extracts their last segments, and then removes
 * the corresponding property nodes from the XML.
 *
 * @param {string} xmlContent - The XML content as a string.
 * @returns {Promise<string>} - A promise resolving to the modified XML content without the primary key properties.
 */
export const removePrimarykeys = async (xmlContent: string): Promise<string> => {
  const targets = await filterTargetsWithoutLabel(xmlContent);
  console.log('Found targets with "/_0" without Common.Label:');
  const results = extractLastSegments(targets);

  const xmlWithoutPrimarykeys = removePropertyNodeByName(xmlContent, results);
  return xmlWithoutPrimarykeys;
};

/**
 * Reads an XML file and returns its content as a string.
 *
 * This function synchronously reads the contents of a specified XML file and returns it
 * as a string. It uses the file path provided as the argument to access and read the file.
 *
 * @param {string} filePath - The path of the XML file to read.
 * @returns {string} - The content of the XML file as a string.
 *
 * @example
 * const xmlContent = ReadXMLFile('path/to/file.xml');
 * console.log(xmlContent); // Outputs the content of the file as a string.
 */
export const ReadXMLFile = (filePath: string): string => fs.readFileSync(filePath, "utf-8");

/**
 * Writes content to an XML file.
 *
 * This function synchronously writes the provided content to the specified file path.
 * If the file does not exist, it will be created. The content is written in UTF-8 encoding.
 *
 * @param {string} filePath - The path where the XML file should be written.
 * @param {string} content - The content to be written to the file.
 *
 * @example
 * const content = '<root><child>value</child></root>';
 * WriteXMLFile('path/to/file.xml', content); // Writes the XML content to the file.
 */
export const WriteXMLFile = (filePath: string, content: string): void => fs.writeFileSync(filePath, content, "utf-8");

export function XMLLogger(): void {
  logger.info("=============================================");
  logger.info("=========== XML Logger is EXECUTED ==========");
  logger.info("=============================================");
}
