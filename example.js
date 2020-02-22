import { ActionFactory, commonAsyncAction } from 'utils/redux';
import P from 'utils/reduxReducer';

export const subA = ActionFactory('PREFIX_');

export const aSetHeaders = subA('headers: obj');

export const aSaveLoad = commonAsyncAction(subA,
    ['loadId: num'],
    async ({ loadId }, dispatch, getSt) =>
    {
        // const data = getLoadUpdatePack(getSt(), loadId); -- async fetching data
        aSetHeaders({  }) |> dispatch;
    }
);

subA.map(
{
    [aSetHeaders]: ((st, { headers }) => {
        //Object.assign($edit.load, diff); -- setting headers
    }) |> P,
});

const A = ActionFactory('');
A.addSubReducer(subA, null);

// pass this reducer into createStore and everything will be fine
// but firstly, if yuo want to use async actions, please apply thunk-middleware
export const reducer = (st, action) =>
{
    if(!st)
        st = initialRootState;

    if(action.type.startsWith('@')) // system
        return st;

    return A.reduce(st, null, action, st);
};
