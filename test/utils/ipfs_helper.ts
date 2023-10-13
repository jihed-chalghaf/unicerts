import * as IPFS from "ipfs-core";
import base58 from "bs58";
import { ethers } from "hardhat";

/** * Creates and returns an IPFS node.
 * @returns {Promise<IPFS.IPFS>} The ipfs node.
 */
export async function initIPFS(): Promise<IPFS.IPFS> {
  const ipfs = await IPFS.create();

  return ipfs;
}

/** * Uploads the given `content` in the given `ipfs` node under `/ipfs/${name}.txt`.
 * @param {IPFS.IPFS} ipfs - The ipfs node where to upload the file.
 * @param {string} name - The name of the file to be uploaded.
 * @param {string} content - The content of the file in string format.
 * @returns {Promise<string>} The cid of the uploaded file.
 */
export async function uploadFile(
  ipfs: IPFS.IPFS,
  name: string,
  content: string
): Promise<string> {
  const file = {
    path: `/ipfs/${name}.txt`,
    content: content,
  };

  const { cid } = await ipfs.add(file);

  return cid.toString();
}

/** * Retrieves a file's content from the given `ipfs` node.
 * @param {IPFS.IPFS} ipfs - The ipfs node where to upload the file.
 * @param {string} cid - The cid of the file to be retrieved.
 * @param {string} name - The name of the file to be retrieved.
 * @returns {Promise<JSON>} The file's content in JSON format.
 */
export async function readFile(
  ipfs: IPFS.IPFS,
  cid: string,
  name: string
): Promise<JSON> {
  for await (const content of ipfs.cat(`/ipfs/${cid}/${name}.txt`)) {
    return JSON.parse(content.toString());
  }

  return JSON.parse("");
}

/** * Returns bytes32 hex string from base58 encoded ipfs hash (`cid`).
 *
 * * Stripping leading 2 bytes from 34 byte IPFS hash.
 *
 * * Assumes IPFS defaults: **function**: `0x12` which refers to `sha2`, **size**: `0x20` which refers to `256 bits`.
 *
 * * E.g. `"QmdUBwxw9cCGcBKzz93hTz1zTipHKVcmnYZhXTE25RPWdf"` -> `"0xe0cdb108dbf4b2a880ec0e9329249206bab69e25b80d74eb735d2970648eb992"`
 * @param {string} cid - The cid to be converted.
 * @returns {string} The cid in bytes32 hex format.
 */
export function getBytes32FromCID(cid: string): string {
  const bytes = base58.decode(cid).slice(2);
  return ethers.utils.hexlify(bytes);
}

/** * Returns base58 encoded ipfs hash (`cid`) from bytes32 hex string.
 *
 * * E.g. `"0xe0cdb108dbf4b2a880ec0e9329249206bab69e25b80d74eb735d2970648eb992"` -> `"QmdUBwxw9cCGcBKzz93hTz1zTipHKVcmnYZhXTE25RPWdf"`
 * @param {string} bytes32Hex - The cid in bytes32 hex format.
 * @returns {string} The original cid.
 */
export function getCIDFromBytes32(bytes32Hex: string): string {
  // Add our default ipfs values for the first 2 bytes:
  // function: 0x12 which refers to sha2, size: 0x20 which refers to 256 bits -> "1220"
  // and remove leading "0x" through input.slice(2)
  const hashHex = "1220" + bytes32Hex.slice(2);
  const hashBytes = Buffer.from(hashHex, "hex");

  return base58.encode(hashBytes);
}
