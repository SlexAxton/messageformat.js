---
title: "Attribute"
parent: "messageformat"
grand_parent: API Reference
---

<!-- Do not edit this file. It is automatically generated by API Documenter. -->



# Attribute interface

> This API is provided as a beta preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

The attributes of [Expression](./messageformat.expression.md) and [Markup](./messageformat.markup.md) are expressed as `key`<!-- -->/`value` pairs to allow their order to be maintained.

**Signature:**

```typescript
export interface Attribute 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [\[cst\]?](./messageformat.attribute._cst_.md) |  | CST.Attribute | **_(BETA)_** _(Optional)_ |
|  [name](./messageformat.attribute.name.md) |  | string | **_(BETA)_** |
|  [type?](./messageformat.attribute.type.md) |  | never | **_(BETA)_** _(Optional)_ |
|  [value?](./messageformat.attribute.value.md) |  | [Literal](./messageformat.literal.md) \| [VariableRef](./messageformat.variableref.md) | **_(BETA)_** _(Optional)_ |
