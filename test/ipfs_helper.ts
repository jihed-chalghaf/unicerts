import * as IPFS from "ipfs-core";

export async function initIPFS() {
  const ipfs = await IPFS.create();

  return ipfs;
}

export async function uploadFile(
  ipfs: IPFS.IPFS,
  name: String,
  content: String
) {
  const file = {
    path: `/ipfs/${name}.txt`,
    content: content,
  };

  const { cid } = await ipfs.add(file);

  return cid.toString();
}
