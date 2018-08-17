import { Document, HookNextFunction, Model, Mongoose, Schema } from 'mongoose';

export interface CounterOptions {
  id: string | null;
  incField: string;
  referenceFields?: string[];
  collectionName: string;
  [k: string]: any;
}

export interface CounterDocument extends Document {
  id: String;
  reference: String[];
  counter: Number;
}

export type StringMap = { [k: string]: string };

class MongooseCounter {
  private schema: Schema;
  private options: CounterOptions = {
    id: null,
    incField: '_id',
    collectionName: 'counters',
  };

  private useReference: boolean = false;
  private counterModel: Model<CounterDocument>;

  constructor(mongoose: Mongoose, schema: Schema, options?: Partial<CounterOptions>) {
    this.schema = schema;

    const counterOptions = { ...this.options, ...options };
    if (!counterOptions.incField) {
      throw new Error('incField option does not null is mandatory');
    }

    if (counterOptions.referenceFields === undefined) {
      counterOptions.referenceFields = [counterOptions.incField];
    } else {
      this.useReference = true;
    }

    counterOptions.referenceFields = Array.isArray(counterOptions.referenceFields)
      ? counterOptions.referenceFields
      : [counterOptions.referenceFields];

    if (this.useReference === true && counterOptions.id === null) {
      throw new Error('Cannot use reference fields without specifying a name');
    } else {
      counterOptions.id = counterOptions.id || counterOptions.incField;
    }

    this.options = counterOptions;
    this.counterModel = this.createCounterModel(mongoose);
  }

  public initialize() {
    this.addCounterToSchema();
    this.addStaticMethods();
    this.addHooks();
  }

  /**
   * Create a model for the counter.
   *
   * @private
   * @param {Mongoose} mongoose
   * @returns
   * @memberof MongooseCounter
   */
  private createCounterModel(mongoose: Mongoose) {
    const { collectionName, id } = this.options;
    const modelName = `${collectionName.charAt(0).toUpperCase()}${collectionName.slice(1)}_${id}`;
    const CounterSchema = new mongoose.Schema(
      {
        id: {
          type: String,
          required: true,
        },
        reference: {
          type: Schema.Types.Mixed,
          required: true,
        },
        counter: {
          type: Number,
          default: 0,
          required: true,
        },
      },
      {
        collection: collectionName,
        validateBeforeSave: false,
        versionKey: false,
        _id: false,
      },
    );

    // @Compound indexes
    CounterSchema.index(
      {
        id: 1,
        reference: 1,
      },
      {
        unique: true,
        sparse: true,
      },
    );

    return mongoose.model<CounterDocument>(modelName, CounterSchema);
  }

  /**
   * Enrich the schema with keys needed by this counter.
   *
   * @private
   * @memberof MongooseCounter
   */
  private addCounterToSchema() {
    const { incField } = this.options;
    const schemaKey: any = this.schema.path(incField);
    if (schemaKey === undefined) {
      this.schema.add({
        [incField]: Number,
      });
    } else if (schemaKey.instance !== 'Number') {
      throw new Error(`Auto increment field "${incField}" already present and not of type "Number"`);
    }
  }

  /**
   * Set some useful methods on the schema.
   *
   * @private
   * @memberof MongooseCounter
   */
  private addStaticMethods() {
    const parent = this;
    this.schema.static('resetCounter', function(
      this: Model<Document>,
      id: string,
      reference: StringMap | Function,
      cb: HookNextFunction,
    ) {
      const condition: any = { id };
      const next = reference instanceof Function ? reference : cb;
      if (!(reference instanceof Function)) {
        condition.reference = parent.getReferenceField(reference);
      }
      return parent.counterModel
        .where(condition)
        .setOptions({ multi: true })
        .update({ $set: { counter: 0 } }, next);
    });
  }

  /**
   * Set and handler for hooks on the schema referenced by this sequence.
   *
   * @private
   * @memberof MongooseCounter
   */
  private addHooks() {
    const parent = this;
    const { id, incField } = this.options;

    this.schema.pre('save', async function(this: Document, next: HookNextFunction) {
      if (!this.isNew) return next();

      try {
        const reference = parent.getReferenceField(this.toJSON());
        const res = await parent.counterModel.findOneAndUpdate(
          { id, reference },
          { $inc: { counter: 1 } },
          { new: true, upsert: true },
        );
        this.set(incField, res.counter);
        next();
      } catch (err) {
        next(err);
      }
    });
  }

  /**
   * Given a mongoose document values of the fields set as reference for the counter.
   *
   * @private
   * @param StringMap document A mongoose document values
   * @returns An array of strings which represent the value of the reference
   * @memberof MongooseCounter
   */
  private getReferenceField(document: StringMap) {
    const { referenceFields } = this.options;
    if (!this.useReference || referenceFields === undefined) return null;
    return referenceFields.reduce((map: StringMap, f: string) => {
      map[f] = document[f];
      return map;
    }, {});
  }
}

/**
 * Initialize
 *
 * @export
 * @param {Mongoose} mongoose Instance to use
 * @returns
 */
export default function mongooseCounter(mongoose: Mongoose) {
  if (!(mongoose instanceof Mongoose)) {
    throw new Error('Please, pass mongoose while requiring mongoose-counters');
  }

  return function(schema: Schema, options?: Partial<CounterOptions>) {
    const counter = new MongooseCounter(mongoose, schema, options);
    counter.initialize();
    return counter;
  };
}
