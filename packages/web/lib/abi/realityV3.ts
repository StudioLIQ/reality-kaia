export const realityV3Abi = [
  {
    type: "function",
    name: "askQuestionERC20V3",
    stateMutability: "nonpayable",
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
    outputs: [{ type: "bytes32" }]
  },
  {
    type: "function",
    name: "totalQuestions",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "getQuestions",
    stateMutability: "view",
    inputs: [
      { type: "uint256", name: "offset" },
      { type: "uint256", name: "limit" }
    ],
    outputs: [{ type: "bytes32[]" }]
  },
  {
    type: "function",
    name: "getQuestionsDesc",
    stateMutability: "view",
    inputs: [
      { type: "uint256", name: "offset" },
      { type: "uint256", name: "limit" }
    ],
    outputs: [{ type: "bytes32[]" }]
  },
  {
    type: "function",
    name: "getQuestionFullV3",
    stateMutability: "view",
    inputs: [{ type: "bytes32", name: "questionId" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { type: "address", name: "asker" },
          { type: "address", name: "arbitrator" },
          { type: "address", name: "bondToken" },
          { type: "uint32", name: "templateId" },
          { type: "uint32", name: "timeout" },
          { type: "uint32", name: "openingTs" },
          { type: "bytes32", name: "contentHash" },
          { type: "uint64", name: "createdAt" },
          { type: "string", name: "content" },
          { type: "string", name: "outcomesPacked" },
          { type: "string", name: "language" },
          { type: "string", name: "category" },
          { type: "string", name: "metadataURI" },
          { type: "uint64", name: "lastAnswerTs" },
          { type: "bytes32", name: "bestAnswer" },
          { type: "uint256", name: "bestBond" },
          { type: "bool", name: "finalized" },
          { type: "bool", name: "pendingArbitration" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getQuestionFullBatch",
    stateMutability: "view",
    inputs: [{ type: "bytes32[]", name: "questionIds" }],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { type: "address", name: "asker" },
          { type: "address", name: "arbitrator" },
          { type: "address", name: "bondToken" },
          { type: "uint32", name: "templateId" },
          { type: "uint32", name: "timeout" },
          { type: "uint32", name: "openingTs" },
          { type: "bytes32", name: "contentHash" },
          { type: "uint64", name: "createdAt" },
          { type: "string", name: "content" },
          { type: "string", name: "outcomesPacked" },
          { type: "string", name: "language" },
          { type: "string", name: "category" },
          { type: "string", name: "metadataURI" },
          { type: "uint64", name: "lastAnswerTs" },
          { type: "bytes32", name: "bestAnswer" },
          { type: "uint256", name: "bestBond" },
          { type: "bool", name: "finalized" },
          { type: "bool", name: "pendingArbitration" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "registerExistingQuestion",
    stateMutability: "nonpayable",
    inputs: [{ type: "bytes32", name: "questionId" }],
    outputs: []
  }
] as const;
