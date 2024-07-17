---
title: "parseMessage"
parent: "messageformat"
grand_parent: API Reference
---

<!-- Do not edit this file. It is automatically generated by API Documenter. -->



# parseMessage() function

A MessageFormat 2 parser for message formatting.

Parses the `source` syntax representation of a message into its corresponding data model representation. Throws on syntax errors, but does not check for data model errors.

**Signature:**

```typescript
export declare function parseMessage(source: string, opt?: MessageParserOptions): Model.Message;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  source | string |  |
|  opt | [MessageParserOptions](./messageformat.messageparseroptions.md) | _(Optional)_ |

**Returns:**

[Model.Message](./messageformat.message.md)
