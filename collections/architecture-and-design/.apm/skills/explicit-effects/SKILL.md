---
name: explicit-effects
description: Use when implementing, reviewing, refactoring, or designing software involving input mutation, shared mutable state, hidden side effects, or unclear ownership of state changes. Also applies to architecture analysis and code-review recommendations about function contracts and orchestration.
---

# Explicit results and owned effects

Prefer functions that treat caller-owned inputs as read-only and return explicit results. State changes belong with the module responsible for that state.

## Read-only inputs and explicit results

Calculations return computed values or decisions rather than communicating through mutations to their inputs. A pricing helper that changes its input cart can make later calculations depend on call order. Returning a calculated price or an updated cart makes that dependency explicit.

A pure function produces equivalent results for the same inputs and has no observable side effects. Avoiding argument mutation alone does not make a function pure. Captured variables, caches, time, and external dependencies can also affect its behavior.

Passing objects is not the problem. Cohesive object parameters can remain intact and read-only; replacing them with many primitives does not establish purity.

## Explicit effects and state ownership

Consequential effects are part of the interface. Names, types, and documented contracts communicate what may change, ownership requirements, and failure behavior. Returning a value does not excuse hidden mutation, and a command name alone does not establish safe ownership.

An orchestrator coordinates execution; it need not contain every field assignment or business rule. A state-owning module protects its own invariants rather than exposing assignments that every caller must coordinate.

Separating pure decisions from effectful execution is **functional core, imperative shell**. This separation is useful when it makes business rules understandable and testable independently. It does not require universal result wrappers or extra orchestration layers.

## Private working mutation

```js
function activeUserNames(users) {
  const names = [];

  for (const user of users) {
    if (user.active) names.push(user.name);
  }

  return names;
}
```

The array remains private until returned. Constructing it with `push` does not change caller-owned data and is compatible with a pure function.

A local variable can still alias the caller's object. A shallow copy still shares nested objects. References that escape through callbacks or shared state can make later mutation externally observable.

## Legitimate state changes

- **Encapsulated state transitions.** An operation such as `invoice.recordPayment(payment)` changes owned state while preserving invariants. An immutable transition function can provide the same guarantees. Correctness depends on ownership and valid transitions, not the choice of mutable syntax.
- **Stateful resources.** Streams, connections, and transactions have lifecycle operations. Their interfaces define ordering, cleanup, and failure behavior without exposing every internal state change to an orchestrator.
- **Atomic shared-state changes.** Pure calculation does not make a read-calculate-save sequence safe. Availability or version conditions hold at the authoritative write through a transaction, conditional update, or version check.
- **Explicit in-place processing.** A writable output buffer or in-place algorithm can avoid meaningful allocation or copying costs. Its contract defines permitted writes, aliasing or exclusive-access requirements, and partial results on failure. Performance is a justification when supported by a concrete constraint or evidence.

These justify specific effects, not unrelated hidden changes. Heavy computation does not require mutable public interfaces; mutable internals can remain encapsulated.

When terminology needs clarification, use React's [local mutation explanation](https://react.dev/learn/keeping-components-pure#local-mutation-your-components-little-secret) and Gary Bernhardt's [functional core, imperative shell](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell). [Command-query separation](https://martinfowler.com/bliki/CommandQuerySeparation.html) separates queries from commands rather than prohibiting mutation.
