import _ from 'lodash';

import { showError } from './error';
import { updByPath } from './immutable';

const typeCheckers =
    {
        str: _.isString,
        num: _.isNumber,
        int: v => _.isNumber(v) && (v % 1 === 0),
        bool: _.isBoolean,
        obj: v => _.isObject(v) && !_.isArray(v),
        arr: _.isArray,
        err:  v => _.isString(v) || v.message,
    };

const setFieldMode =
    {
        null: a => { a.nullable = true; },
    };

const parseFields = params =>
{
    return params.map(mask =>
    {
        const m = mask.match(/^(\w+):\s(\w+)(?:\.(.+))?$/);
        if(!m)
            throw new Error(`Incorrect action mask: ${mask}`);

        const [, key, type, modesS = ''] = m;
        const field = { key, type };

        if(!typeCheckers[type])
            throw new Error(`Incorrect action type: ${type} in ${mask}`);

        for(const mode of _.compact(modesS.split('.')))
        {
            if(!setFieldMode[mode])
                throw new Error(`Incorrect action mode: ${mode} in "${mask}"`);
            setFieldMode[mode](field);
        }

        return field;
    });
};

const prepareVal = (field, val) =>
{
    if(field.type === 'err')
        return val.message
            // convert to valid object json-like
            // for LocalStorage preserving
            ? _.pick(val, 'message', 'stack')
            // unify err-format
            : { message: val };

    return val;
};

const checkVal = (val, field, actionType) =>
{
    if(val === null)
    {
        if(!field.nullable)
            throw new Error(`${actionType}. ${field.type} can't be null`);
        return; // okay!
    }

    const checker = typeCheckers[field.type];
    if(!checker(val))
        throw new Error(`${actionType}. Incorrect value for ${field.type}`);
};

const genPOJO = (args, fields, getType) =>
{
    const type = getType();

    if(args.length > fields.length)
        throw new Error(`Too much arguments for ${type} action`);

    // create POJO-action by mapping args through fields
    return _.transform(fields, (action, field, idx) =>
    {
        const val = prepareVal(field, args[idx]);
        checkVal(val, field, type); // throw
        action[ field.key ] = val;
    }, {});
};

const genActionCreatorFactoryBody = (fields, getType) =>
    (...args) => // body of a particular actionCreator-fn
    {
        return (
            {
                // map each arg to its field
                ...genPOJO(args, fields, getType),
                // default extra fields for each POJO-action
                type: getType(), // action.type ;)
            });
    };

const genAsyncActionCreatorFactoryBody = (fields, getType, cb) =>
    (...args) => // body of a particular actionCreator-fn
    {
        const pojo = genPOJO(args, fields, getType);
        return (dispatch, getSt) =>
        {
            return cb(pojo, dispatch, getSt);
        };
    };

const fabricBuilder = (fieldsMasks, prefix, isAsync, cb) =>
{
    let type = prefix + _.uniqueId();
    const getType = () => type;

    const fields = parseFields(fieldsMasks);

    const fn = isAsync
        ? genAsyncActionCreatorFactoryBody(fields, getType, cb)
        : genActionCreatorFactoryBody(fields, getType);

    fn.setType = name =>
    {
        type = prefix + name;
        return fn;
    };
    fn.toString = fn.getType = getType;

    return fn;
};

/**
 * Implementation for A.reduce. Tool for reduce
 * 1. all subreducers
 * 2. through map of actions
 */
const genActionReducer = (subs, actionsMap) =>
    (parentSt, path, action, rootSt) =>
    {
        const st = path
            ? _.get(parentSt, path)
            : parentSt;

        let newSt = null;
        // look for a proper subreducer
        for(const [A, statePath] of subs)
        {
            // we've found it
            if(A.check(action))
            {
                // it'll handle action
                newSt = A.reduce(st, statePath, action, rootSt);
                break;
            }
        }

        // ok, it's probably our own action
        if(!newSt)
        {
            const handler = actionsMap[ action.type ];
            if(!handler)
                // something got wrong
                throw new Error(`Unsupported action: ${action.type}`);

            newSt = handler(st, action, rootSt);
        }

        return path
            ? updByPath(parentSt, path, newSt)
            : newSt;
    };

export const ActionFactory = prefix =>
{
    // gen a simple POJO-actionCreator
    const builder = (...fieldsMasks) =>
        fabricBuilder(fieldsMasks, prefix, false);

    // // gen an async actionCreator
    builder.async = (fieldsMasks, cb) =>
        fabricBuilder(fieldsMasks, prefix, true, cb);

    builder.prefix = prefix;

    builder.check = action => action.type.startsWith(prefix);

    const actionsMap = {}; // [ %type: handler,* ]
    const subs = []; // [ [A, path].* ]

    builder.map = hash =>
    {
        Object.assign(actionsMap, hash);
        return builder;
    };
    builder.addSubReducer = (A, statePath) =>
    {
        subs.push([A, statePath]);
        return builder;
    };
    builder.reduce = genActionReducer(subs, actionsMap);

    builder.toString = () => `[ActionFactory(${prefix}) object]`;

    return builder;
};

export const commonAsyncAction = (A, masks, handler) => A.async(
    masks,
    async (...args) =>
    {
        try
        {
            return await handler(...args);
        }
        catch(err)
        {
            showError(err);
            throw err;
        }
    });
