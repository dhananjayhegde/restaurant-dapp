import React, { useEffect, useState }from 'react';
import MenuItem from "./MenuItem";
import { nanoid } from "nanoid";

import menuStyles from "../styles/OrderItem.module.css";

export default function OrderItem(props) {

    return (
        <li className={menuStyles.orderItem} onClick={() => props.deleteOrderItem(props.id)}>{props.itemName}<span>{props.price}</span></li>
    );
}