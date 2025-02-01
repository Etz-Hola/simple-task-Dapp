import { useState, useEffect } from 'react';
import { ethers } from "ethers";
import { ToastContainer, toast } from 'react-toastify';
import abi from './abi.json';
import './App.css';

function App() {
  const [task, setTask] = useState('');
  const [taskDes, setTaskDes] = useState('');
  const [wallet, setWallet] = useState('');
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const contractAddress = "0x490b9c89BBB55CA3309608C97dEcdd05f239befC";
  // 0x490b9c89BBB55CA3309608C97dEcdd05f239befC

  
  // Get contract instance with error handling
  const getContract = async () => {
    try {
      if (!window.ethereum) throw new Error("No wallet found!");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return new ethers.Contract(contractAddress, abi, signer);
    } catch (error) {
      console.error("Error getting contract:", error);
      throw error;
    }
  };

  // Fetch tasks with proper error handling and console logging
  async function fetchTasks() {
    if (!wallet) return;

    try {
      console.log("Fetching tasks...");
      const contract = await getContract();
      console.log("Contract retrieved");

      const taskList = await contract.getMyTask();
      console.log("Raw task list:", taskList);

      // Map the tasks with proper data extraction
      const formattedTasks = taskList.map(task => ({
        id: task.id ? task.id.toString() : '0',
        taskTitle: task.taskTitle || '',
        taskText: task.taskText || '',
        isDeleted: task.isDeleted || false
      }));

      console.log("Formatted tasks:", formattedTasks);
      
      // Update state with formatted tasks
      setTasks(formattedTasks.filter(task => !task.isDeleted));
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks. Please try again.");
    }
  }

  async function addTask() {
    if (!wallet) {
      toast.warning("Please connect your wallet first");
      return;
    }

    if (!task || !taskDes) {
      toast.warning("Please fill in all fields");
      return;
    }

    setIsAdding(true);
    try {
      console.log("Adding task:", { title: task, description: taskDes });
      const contract = await getContract();
      
      const tx = await contract.addTask(task, taskDes, false);
      console.log("Transaction sent:", tx.hash);
      
      toast.info("Transaction submitted. Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);

      if (receipt.status === 1) {
        toast.success("Task added successfully");
        setTask('');
        setTaskDes('');
        
        // Add slight delay before fetching tasks
        setTimeout(() => {
          fetchTasks();
        }, 1000);
      }
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    } finally {
      setIsAdding(false);
    }
  }

  // Simplified wallet connection
  async function connectWallet() {
    setIsLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWallet(accounts[0]);
      toast.success("Wallet connected!");
      await fetchTasks();
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet");
    } finally {
      setIsLoading(false);
    }
  }

  // Initial setup
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          await fetchTasks();
        }
      }
    };
    init();
  }, []);

  // Listen for account and network changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          await fetchTasks();
        } else {
          setWallet('');
          setTasks([]);
        }
      });

      // Refresh on network change
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      return () => {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      };
    }
  }, []);

  // The rest of your component's JSX remains the same...
  return (
    <div className="container">
      <div className="app-card">
        <div className="header">
          <h1 className="title">HOLA CORE DAPP</h1>
          
          <div className="wallet-section">
            <button 
              className={`button connect-button ${isLoading ? 'loading' : ''}`}
              onClick={connectWallet}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : wallet ? 'Wallet Connected' : 'Connect Wallet'}
            </button>
            
            {wallet && (
              <div className="wallet-info">
                <span className="wallet-status"></span>
                <span className="wallet-address">
                  {`${wallet.slice(0, 6)}...${wallet.slice(-4)}`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={`form-section ${wallet ? 'active' : ''}`}>
          <input
            type="text"
            placeholder="Enter task title"
            className="input"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
          
          <textarea
            placeholder="Enter task description"
            className="input textarea"
            value={taskDes}
            onChange={(e) => setTaskDes(e.target.value)}
          />
          
          <button 
            className={`button add-button ${isAdding ? 'loading' : ''}`}
            onClick={addTask}
            disabled={isAdding || !wallet}
          >
            {isAdding ? 'Adding Task...' : 'Add Task'}
          </button>
        </div>

        <div className="tasks-section">
          <h2 className="section-title">
            My Tasks
            <span className="task-count">{tasks.length}</span>
          </h2>
          <ul className="task-list">
            {tasks.map((task, index) => (
              <li key={task.id || index} className="task-item">
                <div className="task-header">
                  <h3 className="task-title">{task.taskTitle}</h3>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
                <p className="task-description">{task.taskText}</p>
              </li>
            ))}
            {tasks.length === 0 && (
              <li className="task-item">
                <p className="task-description" style={{ textAlign: 'center' }}>
                  {wallet ? 'No tasks yet. Add your first task!' : 'Connect your wallet to see your tasks'}
                </p>
              </li>
            )}
          </ul>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

export default App;