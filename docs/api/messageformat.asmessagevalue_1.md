---
title: "asMessageValue"
parent: "messageformat"
grand_parent: API Reference
---

<!-- Do not edit this file. It is automatically generated by API Documenter. -->



# asMessageValue() function

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Convert any Date value into a [MessageDateTime](./messageformat.messagedatetime.md)<!-- -->.

<b>Signature:</b>

```typescript
export declare function asMessageValue(ctx: Context, value: Date, format?: {
    meta?: Readonly<Meta>;
    source?: string;
}): MessageDateTime;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  ctx | Context |  |
|  value | Date |  |
|  format | { meta?: Readonly&lt;[Meta](./messageformat.meta.md)<!-- -->&gt;; source?: string; } | <i>(Optional)</i> |

<b>Returns:</b>

[MessageDateTime](./messageformat.messagedatetime.md)
