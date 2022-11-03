import * as IPFS from "ipfs-core";

/** Creates and returns an IPFS node.
 * @returns {Promise<IPFS.IPFS>} The ipfs node.
 */
export async function initIPFS(): Promise<IPFS.IPFS> {
  const ipfs = await IPFS.create();

  return ipfs;
}

/** Uploads the given `content` in the given `ipfs` node under `/ipfs/${name}.txt`.
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

/** Retrieves a file's content from the given `ipfs` node.
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
