import { notification } from 'antd'; // you can use antd notifications or something another, that you like
import React from 'react';

const ErrList = ({ list }) =>
    <ul>
        <For each="msg" of={list} index="idx">
            <li key={idx}>
                {msg}
            </li>
        </For>
    </ul>;

export const showError = err =>
    console.error(err)
    || notification.open(
    {
        message: err.message || err,
        description: err.list && <ErrList list={err.list}/>,
        duration: null,
});
