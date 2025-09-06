import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { LogNewQuestion, LogNewAnswer, LogFinalize } from "../generated/Reality/Reality";
import { RealitioERC20V2 as Oracle } from "../generated/Reality/RealitioERC20V2";
import { Question, Answer } from "../generated/schema";

export function handleLogNewQuestion(event: LogNewQuestion): void {
  const id = event.params.questionId;
  let q = getOrCreateQuestion(id);

  // Header from the view
  let oracle = Oracle.bind(event.address);
  let res = oracle.getQuestionFull(id);

  // tuple mapping (keep order consistent with contract)
  q.asker       = res.value0;              // address
  // res.value1 arbitrator (optional to store if you have a field)
  q.bondToken   = res.value2;
  q.templateId  = res.value3 as i32;
  q.timeoutSec  = res.value4 as i32;
  q.openingTs   = res.value5 as i32;
  q.contentHash = res.value6;
  q.createdAt   = res.value7 as i32;

  q.content        = res.value8;
  q.outcomesPacked = res.value9;
  q.language       = res.value10;
  q.category       = res.value11;
  q.metadataURI    = res.value12;

  q.finalized = false;
  q.pendingArbitration = false;
  q.totalAnswers = 0;
  q.bestBond = q.bestBond || BigInt.zero();

  q.save();
}

function getOrCreateQuestion(id: Bytes): Question {
  let q = Question.load(id);
  if (q == null) {
    q = new Question(id);
  }
  return q;
}

export function handleLogNewAnswer(event: LogNewAnswer): void {
  const id = event.params.questionId;
  let q = getOrCreateQuestion(id);
  
  q.bestAnswer = event.params.answer;
  q.bestAnswerer = event.params.answerer;
  q.bestBond = event.params.bond;
  q.lastAnswerTs = event.params.ts.toI32();
  q.totalAnswers = q.totalAnswers + 1;
  q.save();

  const aId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let a = new Answer(aId);
  a.question = id;
  a.answer = event.params.answer;
  a.answerer = event.params.answerer;
  a.bond = event.params.bond;
  a.ts = event.params.ts;
  a.txHash = event.transaction.hash;
  a.logIndex = event.logIndex.toI32();
  a.save();
}

export function handleLogFinalize(event: LogFinalize): void {
  const id = event.params.questionId;
  let q = Question.load(id);
  if (q == null) return;
  q.finalized = true;
  q.bestAnswer = event.params.answer;
  q.save();
}

