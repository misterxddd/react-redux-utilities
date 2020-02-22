import _ from 'lodash';

export const updByPath = (obj, path, val, tail = '') =>
{
    path = _.isString(path) ? path.split('.') : path;
    const [key, ...remain] = path;

    if(remain.length > 1 && !(key in obj))
        throw new Error(`Couldn't find "${key}" in "${tail}"`);

    const value = remain.length
        ? updByPath(obj[key], remain, val, `${tail}.${key}`)
        : val;

    const clone = _.isArray(obj) ? [ ...obj ] : { ...obj };
    if(value === undefined)
        delete clone[key];
    else
        clone[key] = value;
    return clone;
};

export const arrayIntoObject = (list, key) =>
    list.reduce((acc, obj) =>
    {
        const value = obj[key];
        acc[value] = obj;
        return acc;
    }, {});

export const nestedArrayIntoObject = (list, key, nestedKey) =>
    list.reduce((acc, obj) =>
    {
        const value = obj[key][nestedKey];
        acc[value] = obj;
        return acc;
    }, {});

export const renameObjectProp = (
    oldProp,
    newProp,
    { [oldProp]: old, ...others }) =>
    ({
        [newProp]: old,
        ...others
    });

export const getObjectWithoutProps = (names, object) => Object.keys(object)
    .filter(key => !names.includes(key))
    .reduce((newObject, currentKey) =>
        ({
            ...newObject,
            [currentKey]: object[currentKey]
        }), {});
