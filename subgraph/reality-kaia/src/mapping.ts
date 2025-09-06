import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { LogNewQuestion, LogNewAnswer, LogFinalize } from "../generated/Reality/Reality";
import { Question, Answer } from "../generated/schema";

export function handleLogNewQuestion(event: LogNewQuestion): void {
  const id = event.params.questionId;
  let q = new Question(id);
  q.asker = event.params.asker;
  q.templateId = event.params.templateId;
  q.question = event.params.question;
  q.contentHash = event.params.contentHash;
  q.arbitrator = event.params.arbitrator;
  q.timeout = event.params.timeout;
  q.openingTs = event.params.openingTs;
  q.createdTs = event.params.createdTs;
  q.finalized = false;
  q.save();
}

export function handleLogNewAnswer(event: LogNewAnswer): void {
  const id = event.params.questionId;
  let q = Question.load(id);
  if (q == null) {
    // create placeholder if question wasn't seen (reorg or lookback)
    q = new Question(id);
    q.asker = Bytes.empty();
    q.templateId = 0;
    q.contentHash = Bytes.empty();
    q.arbitrator = Bytes.empty();
    q.timeout = 0;
    q.openingTs = 0;
    q.createdTs = BigInt.fromI32(0);
    q.finalized = false;
  }
  q.bestAnswer = event.params.answer;
  q.bestAnswerer = event.params.answerer;
  q.bestBond = event.params.bond;
  q.lastAnswerTs = event.params.ts;
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

