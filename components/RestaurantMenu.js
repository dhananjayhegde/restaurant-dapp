import React from 'react';
import MenuItem from "./MenuItem";

import menuStyles from "../styles/RestaurantMenu.module.css";

export default function RestaurantMenu(props) {    

    const menuItems = props.menu.map((item) => {
        return <MenuItem key={item.id} id={item.id} addToOrder={props.addToOrder} itemName={item.name} price={item.price} />
    });

    return (
        <ul className="menuStyles.menu"><h2>Menu</h2>
            {menuItems}
        </ul>
    );
}