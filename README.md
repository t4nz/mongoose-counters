mongoose-counter
=============

This plugin create fields which autoincrement their value every time a new document is inserted in a collection.

[![npm](https://img.shields.io/npm/v/mongoose-counter.svg)](https://www.npmjs.com/package/mongoose-counter)
[![GitHub license](https://img.shields.io/github/license/t4nz/mongoose-counter.svg)](https://github.com/t4nz/mongoose-counter/blob/master/LICENSE)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/5f0f54069d254079bdf9e5c71eb7debc)](https://www.codacy.com/app/t4nz/mongoose-counter?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=t4nz/mongoose-counter&amp;utm_campaign=Badge_Grade)
[![npm](https://img.shields.io/npm/dm/mongoose-counter.svg)](https://www.npmjs.com/package/mongoose-counter)
[![TypeScript](https://badges.frapsoft.com/typescript/version/typescript-next.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)

## Installation
---------------
```sh
yarn add mongoose-counter
npm i mongoose-counter
```

## Setup
---------------
This plugin accept a series of options.

- **id**: Id of the counter. Is mandatory only for scoped counters but its use is strongly encouraged.
- **incField**: The name of the field to increment. Mandatory, default is `_id`
- **referenceFields**: The field to reference for a scoped counter. Optional
- **collectionName**: The collection name to mantain the status of the counters. Mandatory, default is `counters`

Use as you would any Mongoose plugin:

```typescript
import * as mongoose from 'mongoose';
import mongooseCounter from 'mongoose-counter';

const counter = mongooseCounter(mongoose);
const schema = new mongoose.Schema({ ... });
schema.plugin(counter, { ...options });
const model = model('MyModel', schema);
```

The increment can be:
- [`global`](#globalCounter): every document has a unique value for the counter field
- [`scoped`](#scopedCounter): the counter depends on the value of other field(s)

### <a name="globalCounter"></a>Global counters
Let's say you want to have an `id` field in your `collection` which has an unique auto-incremented value.

The model schema is something like this:
```typescript
ModelSchema = mongoose.Schema({
  myAttr: String
  ...
});

mongoose.model('ModelName', ModelSchema);
```

You don't need to define the `id` field in your schema because the plugin automatically set it for you. The only thing you have to do is to call:

```typescript
ModelSchema.plugin(counter, { incField: 'id' });
```

Every time a new model entry is created, the `id` field will have an incremental number.

If you want to increment the `_id` field which is special to mongoose, you have to explicitly specify it as a Number and tell mongoose to not interfer:

```typescript
ModelSchema = mongoose.Schema({
  _id: Number,
  myAttr: String
}, { _id: false });
ModelSchema.plugin(AutoIncrement);
```

In this case you don't have to specify `incField` because the default value is `_id`

### <a name="scopedCounter"></a>Scoped counters

Let say our users are organized for `country` and `city`. And we want to save the `inhabitant_number` according to the two informations.
The schema is like this:

```typescript
UserSchema = mongoose.Schema({
    name: String,
    country: String,
    city: String,
    inhabitant_number: Number
});
```

Every time a new Parisian is added the counting of Parisians have to be incremented. The inhabitants of New York must not interfer and have their separated counting. We should define a __scoped__ counter which increment the counter depending on the value of other fields.

```typescript
UserSchema.plugin(AutoIncrement, {id: 'inhabitant_seq', inc_field: 'inhabitant_number', reference_fields: ['country','city'] });
```

Notice that we have to use an id for our sequence, otherwise the plugin will raise an error.

## API
* [`resetCounter()`](#resetCounter)

### resetCounter()
It's possible to programmatically reset a counter through the Model static method `counterReset(id, reference, callback)`. The method take those parameters:

- **id**: the counter to reset. It's mandatory
- **reference**: Let you reset only a specific reference of the counter, if the counter has referenced fields. Optional. By default it reset all the counters for the `id`
- **callback**: A callback which receive an error in case of any. Mandatory


```js
Model.counterReset('the_counter_id', (err) => { ... });

Model.counterReset('the_counter_id', { ref_field_1: 'ref_value_1', ref_field_2: 'ref_value_2'}, (err) => { ... });
```

## Credits
This plugin is inspired by [ramiel/mongoose-sequence](https://github.com/ramiel/mongoose-sequence).
