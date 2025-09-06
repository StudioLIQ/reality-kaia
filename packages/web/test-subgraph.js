// Simple test script to verify subgraph integration
const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'http://localhost:8000/subgraphs/name/reality-kaia';

const query = `
  query Q($first: Int!) {
    questions(first: $first, orderBy: createdTs, orderDirection: desc) {
      id
      asker
      templateId
      openingTs
      timeout
      contentHash
      createdTs
      finalized
      bestAnswer
      bestBond
      bestAnswerer
      lastAnswerTs
    }
  }
`;

async function testSubgraph() {
  console.log('🧪 Testing subgraph connection...');
  console.log('📍 URL:', SUBGRAPH_URL);
  
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        query, 
        variables: { first: 5 } 
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return;
    }

    console.log('✅ Subgraph connection successful!');
    console.log('📊 Questions found:', data.data?.questions?.length || 0);
    
    if (data.data?.questions?.length > 0) {
      console.log('📝 Sample question:');
      console.log(JSON.stringify(data.data.questions[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Subgraph test failed:', error.message);
    console.log('💡 Make sure the subgraph is running:');
    console.log('   cd subgraph/reality-kaia && ./dev.sh');
  }
}

testSubgraph();