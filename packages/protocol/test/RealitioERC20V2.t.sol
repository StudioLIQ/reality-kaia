// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/oracles/Reality/RealitioERC20V2.sol";
import "../src/tokens/MockUSDT.sol";

contract RealitioERC20V2Test is Test {
    RealitioERC20V2 public realitio;
    MockUSDT public usdt;
    
    address public feeRecipient = address(0x123);
    uint16 public feeBps = 25;
    address public permit2 = address(0x456);
    
    function setUp() public {
        usdt = new MockUSDT();
        realitio = new RealitioERC20V2(feeRecipient, feeBps, permit2);
    }
    
    function testAskQuestionERC20Full() public {
        address bondToken = address(usdt);
        uint32 templateId = 3; // Multiple choice
        string memory content = "Who will win the election?";
        string memory outcomesPacked = "Candidate A\x1FCandidate B\x1FCandidate C";
        address arbitrator = address(0x789);
        uint32 timeout = 86400; // 1 day
        uint32 openingTs = 0; // Now
        bytes32 nonce = keccak256("test");
        string memory language = "en";
        string memory category = "politics";
        string memory metadataURI = "https://example.com/metadata.json";
        
        bytes32 questionId = realitio.askQuestionERC20Full(
            bondToken,
            templateId,
            content,
            outcomesPacked,
            arbitrator,
            timeout,
            openingTs,
            nonce,
            language,
            category,
            metadataURI
        );
        
        // Test that the question was stored
        assertTrue(questionId != bytes32(0));
        
        // Test getQuestionHeader
        (address asker, address arb, address bt, uint32 tid, uint32 to, uint32 ot, bytes32 ch, uint64 ct) = 
            realitio.getQuestionHeader(questionId);
        
        assertEq(asker, address(this));
        assertEq(arb, arbitrator);
        assertEq(bt, bondToken);
        assertEq(tid, templateId);
        assertEq(to, timeout);
        assertEq(ot, openingTs);
        assertEq(ch, keccak256(abi.encodePacked(templateId, content)));
        assertTrue(ct > 0);
        
        // Test getQuestionDetails
        (string memory cont, string memory outcomes, string memory lang, string memory cat, string memory uri) = 
            realitio.getQuestionDetails(questionId);
        
        assertEq(cont, content);
        assertEq(outcomes, outcomesPacked);
        assertEq(lang, language);
        assertEq(cat, category);
        assertEq(uri, metadataURI);
        
        // Test getQuestionFull
        (address asker2, address arb2, address bt2, uint32 tid2, uint32 to2, uint32 ot2, bytes32 ch2, uint64 ct2,
         string memory cont2, string memory outcomes2, string memory lang2, string memory cat2, string memory uri2) = 
            realitio.getQuestionFull(questionId);
        
        assertEq(asker2, asker);
        assertEq(cont2, content);
        assertEq(outcomes2, outcomesPacked);
    }
    
    function testAskQuestionERC20Compat() public {
        address bondToken = address(usdt);
        uint32 templateId = 1; // Binary
        string memory content = "Will it rain tomorrow?";
        address arbitrator = address(0x789);
        uint32 timeout = 86400; // 1 day
        uint32 openingTs = 0; // Now
        bytes32 nonce = keccak256("test");
        
        bytes32 questionId = realitio.askQuestionERC20Compat(
            bondToken,
            templateId,
            content,
            arbitrator,
            timeout,
            openingTs,
            nonce
        );
        
        // Test that the question was stored with default values
        assertTrue(questionId != bytes32(0));
        
        (string memory cont, string memory outcomes, string memory lang, string memory cat, string memory uri) = 
            realitio.getQuestionDetails(questionId);
        
        assertEq(cont, content);
        assertEq(outcomes, "");
        assertEq(lang, "en");
        assertEq(cat, "");
        assertEq(uri, "");
    }
}