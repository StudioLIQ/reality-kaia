export const realityV2Abi = [
  {
    type: "function", 
    stateMutability: "view", 
    name: "getQuestionFull",
    inputs: [{ name: "qid", type: "bytes32" }],
    outputs: [
      { type:"address" }, { type:"address" }, { type:"address" },
      { type:"uint32" }, { type:"uint32" }, { type:"uint32" },
      { type:"bytes32" }, { type:"uint64" },
      { type:"string" }, { type:"string" }, { type:"string" }, { type:"string" }, { type:"string" }
    ]
  },
  {
    type: "function", 
    stateMutability: "view", 
    name: "getQuestionHeader",
    inputs: [{ name: "qid", type: "bytes32" }],
    outputs: [
      { type:"address" }, { type:"address" }, { type:"address" },
      { type:"uint32" }, { type:"uint32" }, { type:"uint32" },
      { type:"bytes32" }, { type:"uint64" }
    ]
  },
  {
    type: "function", 
    stateMutability: "view", 
    name: "getQuestionDetails",
    inputs: [{ name: "qid", type: "bytes32" }],
    outputs: [
      { type:"string" }, { type:"string" }, { type:"string" }, { type:"string" }, { type:"string" }
    ]
  },
  {
    type: "function", 
    stateMutability: "nonpayable", 
    name: "askQuestionERC20Full",
    inputs: [
      { type:"address", name:"bondToken" },
      { type:"uint32",  name:"templateId" },
      { type:"string",  name:"content" },
      { type:"string",  name:"outcomesPacked" },
      { type:"address", name:"arbitrator" },
      { type:"uint32",  name:"timeout" },
      { type:"uint32",  name:"openingTs" },
      { type:"bytes32", name:"nonce" },
      { type:"string",  name:"language" },
      { type:"string",  name:"category" },
      { type:"string",  name:"metadataURI" }
    ],
    outputs: [{ type:"bytes32"}]
  },
  {
    type: "function", 
    stateMutability: "nonpayable", 
    name: "askQuestionERC20",
    inputs: [
      { type:"address", name:"bondToken" },
      { type:"uint32",  name:"templateId" },
      { type:"string",  name:"content" },
      { type:"address", name:"arbitrator" },
      { type:"uint32",  name:"timeout" },
      { type:"uint32",  name:"openingTs" },
      { type:"bytes32", name:"nonce" }
    ],
    outputs: [{ type:"bytes32"}]
  }
] as const;