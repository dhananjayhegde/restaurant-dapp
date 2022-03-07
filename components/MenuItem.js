import React from 'react';
import menuStyles from "../styles/RestaurantMenu.module.css";

export default function MenuItem(props) {

    return (
        <li className={menuStyles.menuItem} onClick={() => props.addToOrder(props.id)}>{props.itemName}<span>{props.price.toFixed(4)}</span></li>
    );
}