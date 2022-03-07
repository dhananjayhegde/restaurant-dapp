import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Web3Modal from "web3modal"
import { providers, Contract, ethers } from "ethers"
import { useEffect, useRef, useState } from 'react'
import { RESTAURANT_CONTRACT_ADDRESS, abi } from "../constants"
import RestaurantMenu from '../components/RestaurantMenu'
import OrderItem from '../components/OrderItem'
import { nanoid } from "nanoid";

/**
   * Factory method for menu item objects
   * @param {*} name 
   * @param {*} price 
   * @returns 
   */
const prepareMenuItem = (name, price) => {
  return {
    id: nanoid(),
    name: name,
    price: price,
  }
};

export default function Home() {

  const TIP = {
    notip: 0,
    good: 5,
    excellet: 10,
    awesome: 20
  };

  const PAYMENT_STATUS = {
    initial: 0,
    success: 1,
    failed: 2,
    pending: 3
  };

  const menu = [
    prepareMenuItem("Gobi Paratha", 0.0001),
    prepareMenuItem("Aloo Paratha", 0.002),
    prepareMenuItem("Muli Paratha", 0.003),
    prepareMenuItem("Gobi Paneer", 0.002),
    prepareMenuItem("Paneer Butter Masala", 0.01),
    prepareMenuItem("Paneer Tikka", 0.02),
  ]; 

  const [walletConnected, setWalletConnected] = useState(false);

  const [orderItems, setOrderItems] = useState([]);
  const [orderItemCount, setOrderItemCount] = useState(0);
  const [orderSubTotal, setOrderSubTotal] = useState(0);
  const [orderTotal, setOrderTotal] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUS.initial);
  const [tipAmount, setTipAmount] = useState(TIP.notip);
  const [lastOrderAmount, setLastOrderAmount] = useState(0);
  
  // const [joinedWhitelist, setJoinedWhitelist] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // this is persisted as long as the page is open
  const web3ModalRef = useRef();

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();

    if (chainId !== 4) {
      window.alert("Change Network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }

    return web3Provider;
  }

  /**
   * Connect to Meta Mask wallet on the browser
   */
  const connectWallet = async () => {
    try {
      // When called for the first time, prompts user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    
    } catch (error) {
      console.error(error)
    }
  }

  const makePayment = async (options) => {
    try {
      // Making payment requires a signer
      const signer = await getProviderOrSigner(true);

      const restrntContract = new Contract(
        RESTAURANT_CONTRACT_ADDRESS,
        abi,
        signer
      );

      const receipt = await restrntContract.acceptOrderPayment(options);
      
      setLoading(true);
      setPaymentStatus(PAYMENT_STATUS.pending);
      
      await receipt.wait();
      setLoading(false);
      
      const totalAmountForCustomer = await restrntContract.getTotalAmountByCustomer();
      setPaymentStatus(PAYMENT_STATUS.success);
    
    } catch (error) {
      console.error(error); 
      setPaymentStatus(PAYMENT_STATUS.error);
    }
  }

  /**
   * Conditionally render a button depending on the status of the dApp
   */
  const renderButton = () => {
    if (walletConnected) {
      // check if already in whitelist
      return (
        <div className={styles.description}>
          Walltet Connected.  You are all set to order from our delicious menu!!!
        </div>
      )   
    } else {
      // Wallet not connected, ask to connect first
      return (
        <button onClick={connectWallet} className={styles.button}>Connect your Wallet</button>
      )
    }
  }

  /**
   * Based on Payment status, render different buttons in place of "Pay"
   * @returns 
   */
  const renderPaymentButton = () => {
    if (paymentStatus === PAYMENT_STATUS.pending) {
      return <button className={styles.button} >Pending...</button>
    } else if (paymentStatus == PAYMENT_STATUS.initial) {
      return <button className={styles.button} onClick={onPayButtonClick}>Pay</button>
    } else if (paymentStatus === PAYMENT_STATUS.error) {
      return <button className={styles.button} onClick={onPayButtonClick}>Retry Payment</button>
    }
  }

  /**
   * When the value of walletConnected changes, do something
   */
  useEffect(() => {
    if (!walletConnected) {
      
      // current vlaue of the reference is persisted as long as the page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false
      });

      connectWallet();
    }
  }, [walletConnected]);

  /**
   * When either tip amount is changed OR a order items are changed 
   *    -> adding or removing items from order
   * update order amount
   * @param {*} name 
   * @param {*} price 
   * @returns 
   */
  useEffect(() => {
    setOrderTotal(orderSubTotal + (orderSubTotal * (tipAmount / 100)));
  }, [orderSubTotal, tipAmount]);

  /**
   * When payment status is successful, rest the order data, abd billing data
   * Clean slate for next order
   */
  useEffect(() => {
    if (paymentStatus === PAYMENT_STATUS.success) {
      setLastOrderAmount(orderTotal);
      setOrderItems([]);
      setOrderTotal(0);
      setOrderSubTotal(0);
      setPaymentStatus(PAYMENT_STATUS.initial);
    }
  }, [paymentStatus])


  
  /**
   * Handle menu item selection -> add it to order
   * @param {} itemId 
   * @returns 
   */
  const addToOrder = (itemId) => {
    
    const validMenuItems = menu.filter((item) => itemId === item.id);
    
    if (!validMenuItems) {
      alert("Invalid item selected");
      return;
    }

    const newOrderItem = validMenuItems[0];
    
    setOrderItemCount(orderItemCount + 1);
    newOrderItem.key = orderItemCount;
    
    setOrderItems([...orderItems, newOrderItem]);
    setOrderSubTotal(orderSubTotal + newOrderItem.price);
  }

  /**
   * Delete item from order and update remaining items
   * @param {*} orderItemId 
   */
  const deleteOrderItem = (orderItemId) => {
    const deletedItem = orderItems.filter((item) => item.id === orderItemId)[0]
    const remainingItems = orderItems.filter((item) => item.id !== orderItemId);
    setOrderItems(remainingItems);
    setOrderSubTotal(orderSubTotal - deletedItem.price);
  }

  /**
   * calculate orderTotal when TIP selection is changed
   * @param {*} event 
   */
  const handleTipSelectionChange = (event) => {
    const tip = parseFloat(event.target.value);
    setTipAmount(tip);
  }

  
  /**
   * Handle Pay button click 
   * @param {} event 
   */
  const onPayButtonClick = (event) => {   
    // initiate Payment if wallet is connected
    if (!walletConnected) {
      connectWallet();
    }

    // total amount to pay is = orderTotal => convert this to ETH
    const options = { value: ethers.utils.parseEther(orderTotal.toString()) };
    makePayment(options);
  }


  /**
   * Prepare order items compoenent every time a new item is added
   * orderItems is in the state.  This gets updated as soon as
   * setOrderItems() is called
   * this ensures re-rendering of the component
   */
  const order = orderItems.map((orderItem) => {
    return <OrderItem
      key={orderItem.key}
      id={orderItem.id}
      itemName={orderItem.name}
      price={orderItem.price.toFixed(4)}
      deleteOrderItem={deleteOrderItem}
    />;
  });

  const renderOrderStatusMessage = () => {
    if (paymentStatus === PAYMENT_STATUS.success) {
      return <h2 className={styles.success}>Done!!!. Total Paid: <span>{lastOrderAmount}</span></h2>
    } else if (paymentStatus === PAYMENT_STATUS.error) {
      return <h2 className={styles.error}>We are sorry, payment failed, please try again!</h2>
    } else {
      return <></>
    }
  };

  return (
    <div>
      <Head>
        <title>Restaurant dApp</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className={styles.main}>
        
        <header>
          <h1 className={styles.title}>Welcome to Cryptic Valley Restaurant!</h1>
          <div className={styles.description}>
            Use your Crypto wallet to place order!
          </div>
          {renderButton()}
        </header>
        
        <div className={styles.content}>
          <div className={styles.menuContainer}>
            <RestaurantMenu addToOrder={addToOrder} menu={menu} />
          </div>
          
          <div className={styles.orderContainer}>
            <ul><h2>Your Order</h2>
              {order}
            </ul>
            <div>
              <h2>Order Subtotal<span>{orderSubTotal.toFixed(4)}</span></h2>
            </div>
          </div>
          
          <div className={styles.billingContainer}>
            <div>
              <table className={styles.billingTable}>
                <thead>
                  <tr>
                    <th colSpan="2"><h2>Billing</h2></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Order Subtotal</td>
                    <td className={styles.subtotal}>{orderSubTotal.toFixed(4)}</td>
                  </tr>
                  <tr>
                    <td><label htmlFor="tip">Rate our service</label></td>
                    <td>
                      <select id="tip" placeholder="Select a tip" onChange={handleTipSelectionChange}>
                        <option value={TIP.notip}>How did you like it?</option>
                        <option value={TIP.good}>Good - 5%</option>
                        <option value={TIP.excellet}>Excellent - 10%</option>
                        <option value={TIP.awesome}>Awesome - 20%</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td>Order Total</td>
                    <td className={styles.total}>{orderTotal.toFixed(4)}</td>
                  </tr>
                </tfoot>
              </table>
              <div>
                {renderPaymentButton()}
              </div>
              <div>
                {renderOrderStatusMessage()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  )
}
