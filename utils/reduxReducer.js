import _ from 'lodash';

/**
 * Set of tools which allow a developer to write
 * a mutable-code which in fact works as immutable ;)
 */

const arrayMethods =
    {
        push: (current, setter) => (...newElements) =>
        {
            const value = current.concat(...newElements);
            setter(value);
            return value.length;
        },

        unshift: (current, setter) => (...newElements) =>
        {
            const value = newElements.concat(...current);
            setter(value);
            return value.length;
        },

        splice: (current, setter) => (...args) =>
        {
            const clone = [...current];
            const result = clone.splice(...args);
            setter(clone);
            return result;
        },

        // pop: todo

        [Symbol.iterator]: current => () => current[Symbol.iterator](),
    };

const proxySym = Symbol();
// in case when we set as a value any other proxified value
// we should set its plain value
const prepareVal = val => (val && val[proxySym])
    ? val[proxySym].current
    : val;

const proxify = (obj, up, upKey) =>
{
    if(typeof obj !== 'object')
        throw new Error(`Can't proxify a plain value, key: ${upKey}`);

    let current = obj;

    const proxy = new Proxy(obj,
        {
            get(obj, prop)
            {
                if(prop === proxySym)
                    // for prepareVal()
                    return { current };

                if(!_.isObject(current[prop]))
                    return current[prop];

                if(_.isFunction(current[prop]) && _.isArray(current))
                    return arrayMethods[prop](
                        current,
                        newVal =>
                        {
                            newVal = prepareVal(newVal);
                            up[upKey] = newVal;
                            current = newVal;
                        });

                if(prop === 'constructor')
                    // don't wrap standart array|object constructors for lodash
                    return current[prop];

                const [sub] = proxify(current[prop], proxy, prop);
                return sub;
            },

            set(obj, key, val)
            {
                val = prepareVal(val);

                if(_.isArray(current))
                {
                    current =  [...current];
                    current[key] = val;
                }
                else current = { ...current, [key]: val };

                if(up)
                    up[upKey] = current;
                return true;
            },

            deleteProperty(obj, prop)
            {
                current = _.omit(current, prop);
                if(up)
                    up[upKey] = current;
                return true;
            },
        });

    return [proxy, () => current];
};

const P = function proxifyReducerCase(fn)
{
    return (st, ...args) =>
    {
        const [proxy, get] = proxify(st);
        fn(proxy, ...args);
        return get();
    };
};

P.set = field => P((st, action) =>
{
    st[field] = action[field];
});

P.const = val => () => val;

export default P;
