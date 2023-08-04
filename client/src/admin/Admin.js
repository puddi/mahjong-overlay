import React from "react";
import './Admin.css';
import { useParams } from 'react-router-dom';
import useStickyState from "../hooks/useStickyState";

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

const Admin = () => {
  const [ws, setWs] = React.useState(null);
  const { overlayId } = useParams();
  const [showingUsers, setShowingUsers] = React.useState(false);
  const [ronModalOpen, setRonModalOpen] = React.useState(false);
  const [tsumoModalOpen, setTsumoModalOpen] = React.useState(false);
  const [ryuukyokuModalOpen, setRyuukyokuModalOpen] = React.useState(false);
  const [possibleWinner, setPossibleWinner] = React.useState(null);
  const [possibleLoser, setPossibleLoser] = React.useState(null);
  const lastPossibleWinner = React.useRef();

  const [gameTitle, setGameTitle] = useStickyState('', `${overlayId}-gameTitle`)
  const [gameActive, setGameActive] = useStickyState(false, `${overlayId}-gameActive`)
  const [users, setUsers] = useStickyState([], `${overlayId}-users`);
  const [players, setPlayers] = useStickyState([], `${overlayId}-players`);
  const [points, setPoints] = useStickyState([30000, 30000, 30000, 30000], `${overlayId}-points`)
  const [round, setRound] = useStickyState(1, `${overlayId}-round`);
  const [honba, setHonba] = useStickyState(0, `${overlayId}-honba`);
  const [riichiTenpaiStatus, setRiichiTenpaiStatus] = useStickyState([0, 0, 0, 0], `${overlayId}-riichiTenpaiStatus`);
  const [riichiSticks, setRiichiSticks] = useStickyState(0, `${overlayId}-riichiSticks`);
  const [dora, setDora] = useStickyState([], `${overlayId}-dora`);
  const [gameOver, setGameOver] = useStickyState(false, `${overlayId}-gameOver`);

  const [gameHistory, setGameHistory] = useStickyState([], `${overlayId}-gameHistory`);

  const gameState = {
    players: players.map((player, index) => ({
      ...users.find(user => user.uuid === player),
      points: points[index],
    })),
    round,
    honba,
    riichiSticks,
    riichiTenpaiStatus,
    dora,
    gameOver,
    gameActive,
    gameTitle,
  }

  const setRoundHelper = (r) => {
    if (r > 8) {
      setGameOver(true);
    }
    setRound(Math.min(8, r));
  }

  React.useEffect(() => {
    if (possibleWinner != null) {
      lastPossibleWinner.current = possibleWinner;
    }
  }, [possibleWinner]);

  React.useEffect(() => {
    let socket;
    if (window.location.hostname === 'localhost') {
      socket = new WebSocket(`ws://localhost:443/${overlayId}`);
    } else {
      socket = new WebSocket(`wss://${window.location.host}/${overlayId}`);
    }

    setWs(socket);
  }, []);

  React.useEffect(() => {
    if (gameActive === false) {
      try {
        ws?.send(JSON.stringify({
          gameActive: false,
        }));
      } catch (e) {}
    }
  }, [ws, gameActive]);

  const sendGameState = () => {
    ws?.send(JSON.stringify(gameState));
  }

  const forceSync = () => {
    sendGameState();
    maybeUpdateGameHistory();
  }

  const addUser = (event) => {
    const newUsers = [...users, {
      uuid: uuidv4(),
      name: event.target.value,
      subtitle: '',
    }];
    setUsers(newUsers);
    event.target.value = '';
  }

  const updateUser = (uuid, updates) => {
    const index = users.findIndex(user => user.uuid === uuid);
    const newUser = {...users[index], ...updates};
    const newUsers = users.toSpliced(index, 1, newUser);
    setUsers(newUsers);
  }

  const togglePlayer = (uuid) => {
    if (players.includes(uuid)) {
      setPlayers(players.filter(player => player !== uuid));
    } else {
      setPlayers([...players, uuid]);
    }
  }

  const swapPlayers = (idx1, idx2) => {
    const newPlayers = [...players];
    newPlayers[idx2] = players[idx1];
    newPlayers[idx1] = players[idx2];
    setPlayers(newPlayers);
  }

  const startGame = () => {
    setGameActive(true);
    setGameOver(false);
    setPoints([30000, 30000, 30000, 30000]);
    setRound(1);
    setHonba(0);
    setRiichiSticks(0);
    setDora([]);
    setRiichiTenpaiStatus([0, 0, 0, 0]);
    setPossibleWinner(null);
    setPossibleLoser(null);
  }

  React.useEffect(() => {
    sendGameState();
  }, [honba, round, riichiSticks, riichiTenpaiStatus, dora, gameOver]);

  const maybeUpdateGameHistory = () => {
    const gameState = {
      players: players.map((player, index) => ({
        ...users.find(user => user.uuid === player),
        points: points[index],
      })),
      gameOver,
      round,
      honba,
      riichiSticks
    }

    if (gameHistory.length === 0 || JSON.stringify(gameState) !== JSON.stringify(gameHistory[gameHistory.length - 1])) {
      if (players.length === 4 && gameActive) {
        setGameHistory([...gameHistory, gameState]);
      }
    }
  }

  React.useEffect(() => {
    maybeUpdateGameHistory();
  }, [honba, round, players, gameActive, gameOver]);

  const roundString = (r) => {
    if (r <= 0) {
      return 'N/A';
    } else if (r <= 4) {
      return `East ${r}`;
    } else if (r <= 8) {
      return `South ${r - 4}`;
    } else if (r <= 12) {
      return `West ${r - 8}`;
    } else if (r <= 16) {
      return `North ${r - 12}`;
    }
  }
  
  const declareRiichi = (index) => {
    const newRiichiTenpaiStatus = [...riichiTenpaiStatus];
    const newPoints = [...points];
    newRiichiTenpaiStatus[index] = 1;
    newPoints[index] -= 1000;
    setRiichiSticks(riichiSticks + 1);
    setPoints(newPoints);
    setRiichiTenpaiStatus(newRiichiTenpaiStatus);
  }

  const undeclareRiichi = (index) => {
    const newRiichiTenpaiStatus = [...riichiTenpaiStatus];
    const newPoints = [...points];
    newRiichiTenpaiStatus[index] = 0;
    newPoints[index] += 1000;
    setRiichiSticks(Math.max(0, riichiSticks - 1));
    setPoints(newPoints);
    setRiichiTenpaiStatus(newRiichiTenpaiStatus);
  }

  const markTenpai = (index) => {
    const newRiichiTenpaiStatus = [...riichiTenpaiStatus];
    newRiichiTenpaiStatus[index] = 2;
    setRiichiTenpaiStatus(newRiichiTenpaiStatus);
  }

  const unmarkTenpai = (index) => {
    const newRiichiTenpaiStatus = [...riichiTenpaiStatus];
    newRiichiTenpaiStatus[index] = 0;
    setRiichiTenpaiStatus(newRiichiTenpaiStatus);
  }

  const handleTsumo = (childValue, adultValue) => {
    setTsumoModalOpen(false);
    if (possibleWinner == null) {
      return;
    }

    const dealerIndex = (round - 1) % 4;
    const winnerIndex = players.indexOf(possibleWinner);

    const newPoints = [...points];

    let count = 0;
    if (dealerIndex === winnerIndex) {
      const payment = adultValue + (100 * honba);
      for (let i = 0; i < 4; i++) {
        if (dealerIndex !== i) {
          newPoints[i] -= payment;
        }
      }

      newPoints[winnerIndex] += (payment * 3) + (1000 * riichiSticks);
      setHonba(honba + 1);
    } else {
      for (let i = 0; i < 4; i++) {
        if (dealerIndex === i) {
          const payment = adultValue + (100 * honba);
          count += payment;
          newPoints[i] -= payment;
        } else if (winnerIndex !== i) {
          const payment = childValue + (100 * honba);
          count += payment;
          newPoints[i] -= payment;
        }
      }

      newPoints[winnerIndex] += count + (1000 * riichiSticks);
      setRoundHelper(round + 1);
      setHonba(0);
    }

    setPoints(newPoints);
    setRiichiSticks(0);
    resetHand();
  }

  const handleRon = (childValue, adultValue) => {
    setRonModalOpen(false);
    if (possibleWinner == null || possibleLoser == null) {
      return;
    }

    const dealerIndex = (round - 1) % 4;
    const winnerIndex = players.indexOf(possibleWinner);
    const loserIndex = players.indexOf(possibleLoser);

    const newPoints = [...points];

    if (winnerIndex === dealerIndex) {
      newPoints[loserIndex] -= adultValue + (300 * honba);
      newPoints[winnerIndex] += adultValue + (300 * honba) + (1000 * riichiSticks);
      setHonba(honba + 1);
    } else {
      newPoints[loserIndex] -= childValue + (300 * honba);
      newPoints[winnerIndex] += childValue + (300 * honba) + (1000 * riichiSticks);
      setRoundHelper(round + 1);
      setHonba(0);
    }

    setPoints(newPoints);
    setRiichiSticks(0);
    resetHand();
  }

  const resetHand = () => {
    setRiichiTenpaiStatus([0,0,0,0]);
    setPossibleWinner(null);
    setPossibleLoser(null);
    setDora([]);
  }

  const handleRyuukyoku = () => {
    setRyuukyokuModalOpen(false);
    const playersTenpai = riichiTenpaiStatus.filter(status => status !== 0).length;
    if (playersTenpai !== 0 && playersTenpai !== 4) {
      let tenpaiAdjustment = 0;
      let notenAdjustment = 0;
      
      if (playersTenpai === 1) {
        tenpaiAdjustment = 3000;
        notenAdjustment = -1000;
      } else if (playersTenpai === 2) {
        tenpaiAdjustment = 1500;
        notenAdjustment = -1500;
      } else if (playersTenpai === 3) {
        tenpaiAdjustment = 1000;
        notenAdjustment = -3000;
      }

      const newPoints = [...points];

      for (let i = 0; i < riichiTenpaiStatus.length; i++) {
        newPoints[i] += (riichiTenpaiStatus[i] === 0 ? notenAdjustment : tenpaiAdjustment);
      }

      setPoints(newPoints);
    }
    
    setHonba(honba + 1);
    const dealerIndex = (round - 1) % 4;
    if (riichiTenpaiStatus[dealerIndex] === 0) {
      setRoundHelper(round + 1);
    }

    resetHand();
   
  }

  const addDora = (tile) => {
    if (dora.length < 4) {
      setDora([...dora, tile]);
    } else if (dora.length === 4) {
      if (dora.filter(d => d === tile).length !== 4) {
        setDora([...dora, tile]);
      }
    }
  }

  const removeDoraAtIndex = (index) => {
    setDora(dora.toSpliced(index, 1));
  }

  const isPossibleWinnerDealer = players.indexOf(possibleWinner ?? lastPossibleWinner.current) === (round - 1) % 4;

  const checkSum = (points[0] + points[1] + points[2] + points[3] + (riichiSticks * 1000)) === 120000;

  const endGame = () => {
    setGameActive(false);
    setGameHistory([]);
  }

  const revertToState = (gameState, index) => {
    if (window.confirm('Are you sure you want to revert state?')) {
      setGameHistory(gameHistory.toSpliced(index + 1, Infinity));
      setHonba(gameState.honba);
      setRound(gameState.round);
      setPoints(gameState.players.map(player => player.points));
      setRiichiSticks(gameState.riichiSticks);
      setGameOver(gameState.gameOver);
      resetHand();
    }
  }

  return (
    <div className="admin">
      <header className="admin-header">
        {(gameTitle?.length ?? 0) !== 0 && `${gameTitle} - `} Game Status: {gameActive ? <span className='gamestatus-active'>{gameOver ? 'Active - Game Over' : 'Active - In Progress'}</span> : <span className='gamestatus-inactive'>Inactive</span>}
        {gameActive && <button onClick={() => endGame()} className={'endGameButton'}>End Game</button>}        
        <button className='overlayButton' onClick={() => window.open(`/overlay/${overlayId}`)}>Open Overlay</button>
        <button className='usersButton' onClick={() => setShowingUsers(!showingUsers)}>{showingUsers ? 'Hide Users' : 'Show Users'}</button>
      </header>
      <section className={"admin-sidebar " + (showingUsers ? "visible" : "")}>
        <p>Add a user, then select 4 users to be "players" in the game.</p>
        <input placeholder={'Name'} onKeyDown={(event) => event.key === 'Enter' ? addUser(event) : null} />
        <hr />

        {users.map(({name, subtitle, uuid}) => (
          <div className="userSidebarCard" key={uuid}>
            <label className={gameActive || (!players.includes(uuid) && players.length >= 4) ? "labelDisabled" : ""}>
              <input disabled={gameActive || (!players.includes(uuid) && players.length >= 4)} type="checkbox" checked={players.includes(uuid)} onChange={(e) => togglePlayer(uuid)} />
            </label>
            <div>
              <input className="nameInput" placeholder={'Name'} value={name} onChange={(e) => updateUser(uuid, {name: e.target.value})}></input>
              <input className="subtitleInput" placeholder={'Subtitle'} value={subtitle} onChange={(e) => updateUser(uuid, {subtitle: e.target.value})}></input>
            </div>
          </div>
        ))}
      </section>

      <section className="admin-content">
        {!gameActive && (
          <section>
            <h2>PRE-GAME: Players / Seat Order</h2>

            <p>Use the arrows to adjust dealer order. Starting dealer should be left-most (East), then in South, West, and North order.</p>

            <div className="seating-tips">
              <span><span>East</span></span>
              <span><span>South</span></span>
              <span><span>West</span></span>
              <span><span>North</span></span>
            </div>
            <div className='playerCards'>
            {players.map((player, index) => {
              const user = users.find(user => user.uuid === player);

              return (
                <div className='playerCard'>
                  <div className='playerPositionControls'>
                    <button disabled={index === 0} onClick={() => swapPlayers(index - 1, index)}>&lt;</button>
                    <h3>{user.name}</h3>
                    <button disabled={index === 3} onClick={() => swapPlayers(index, index + 1)}>&gt;</button>
                  </div>
                  <p>{user.subtitle}</p>
                </div>
              )
            })}
            </div>

            <hr />
            <h3>Game Title</h3>
            <p>Set a game title. You can change this later.</p>
            <input placeholder={'Game Title'} style={{width: '500px'}} value={gameTitle} onChange={(event) => setGameTitle(event.target.value)} />

            {players.length === 4 && <>
              <hr />
              <p className={'startParagraph'}>When you're ready to start, hit the "Start Game" button below.</p>
              <button onClick={startGame} className={'startGameButton'}>Start Game</button>
            </>}
          </section>
        )}

        {gameActive && (
          <section className={'active-game'}>
            <input className={'gameTitleActiveInput'} style={{width: '100%'}} placeholder={'Game Title'} value={gameTitle} onChange={(event) => setGameTitle(event.target.value)} />
            <div className='topSection'>
              <div className={'game-status'}>

                <h2 className={'gameStatusActive'}>Currently: <strong>{gameOver ? 'Game Over' : roundString(round)}</strong></h2>
                <p className={'round-buttons'}><button disabled={round === 1} onClick={() => setRound(round - 1)}>To {roundString(round - 1)}</button> 
                <button onClick={() => setRoundHelper(round + 1)}>To {roundString(round + 1)}</button>
                <button onClick={() => setRyuukyokuModalOpen(true)}>Ryuukyoku</button></p>

                <p>Honba: {honba} <button disabled={honba <= 0} onClick={() => setHonba(honba - 1)}>-1</button> <button onClick={() => setHonba(honba + 1)}>+1</button></p>
                <p>Riichi Sticks: {riichiSticks} <button disabled={riichiSticks <= 0} onClick={() => setRiichiSticks(riichiSticks - 1)}>-1</button> <button onClick={() => setRiichiSticks(riichiSticks + 1)}>+1</button></p>
                <p>Checksum: <span style={{color: checkSum ? 'green' : 'red'}}>{(points[0] + points[1] + points[2] + points[3] + (riichiSticks * 1000)).toLocaleString()}</span> <button onClick={() => forceSync()}>Force Sync</button>
                  {gameOver && <button onClick={() => setGameOver(false)} style={{marginLeft: '10px'}}>Un-Game Over</button>} </p>
              </div>

              <div className={'doraSection'}>
                <div className={'selectedDora'}>
                  <h2>Dora Selection</h2>
                  {dora.length === 0 && <span style={{color: 'red'}}>No Dora Selected</span>}
                  {dora.map((tile, index) => {
                    return <img className="tile" onClick={() => removeDoraAtIndex(index)} src={require(`../tiles/${tile}.png`)} />
                  })}
                </div>

                <div className={'tileOptions'}>
                  <div>
                    {['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m'].map(tile => {
                      return <img className="tile" onClick={() => addDora(tile)} src={require(`../tiles/${tile}.png`)} />
                    })}
                  </div>
                  <div>
                    {['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p'].map(tile => {
                      return <img className="tile" onClick={() => addDora(tile)} src={require(`../tiles/${tile}.png`)} />
                    })}
                  </div>
                  
                  <div>
                    {['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s'].map(tile => {
                      return <img className="tile" onClick={() => addDora(tile)} src={require(`../tiles/${tile}.png`)} />
                    })}
                  </div>
                  <div>
                    {['1z', '2z', '3z', '4z', '5z', '6z', '7z'].map(tile => {
                      return <img className="tile" onClick={() => addDora(tile)} src={require(`../tiles/${tile}.png`)} />
                    })}
                  </div>
                </div>
              </div>
            </div>


            <div className="seating-tips">
              <span>
                {(round - 1) % 4 === 0 && <span>Dealer</span>}
                {(riichiTenpaiStatus[0] === 1) && <span className="riichiIndicator">Riichi</span>}
                {(riichiTenpaiStatus[0] === 2) && <span className="tenpaiIndicator">Tenpai</span>}
              </span>
              <span>
                {(round - 1) % 4 === 1 && <span>Dealer</span>}
                {(riichiTenpaiStatus[1] === 1) && <span className="riichiIndicator">Riichi</span>}
                {(riichiTenpaiStatus[1] === 2) && <span className="tenpaiIndicator">Tenpai</span>}
              </span>
              <span>
                {(round - 1) % 4 === 2 && <span>Dealer</span>}
                {(riichiTenpaiStatus[2] === 1) && <span className="riichiIndicator">Riichi</span>}
                {(riichiTenpaiStatus[2] === 2) && <span className="tenpaiIndicator">Tenpai</span>}
              </span>
              <span>
                {(round - 1) % 4 === 3 && <span>Dealer</span>}
                {(riichiTenpaiStatus[3] === 1) && <span className="riichiIndicator">Riichi</span>}
                {(riichiTenpaiStatus[3] === 2) && <span className="tenpaiIndicator">Tenpai</span>}
              </span>
            </div>

            <div className='playerCards'>
              {players.map((player, index) => {
                const user = users.find(user => user.uuid === player);

                const toimen = users.find(user => user.uuid === players[(index + 2) % 4]);
                const kamicha = users.find(user => user.uuid === players[(index + 3) % 4]);
                const shimocha = users.find(user => user.uuid === players[(index + 1) % 4]);

                return (
                  <div className='playerCard'>
                    <h3>{user.name}</h3>
                    <p style={{opacity: user.subtitle.length == 0 ? '0' : '1'}}>{user.subtitle.length == 0 ? 'x' : user.subtitle}</p>
                    <br></br>

                    <input value={points[index]} className='pointsInput' onChange={(e) => {
                      const newPoints = [...points];
                      newPoints[index] = Number.isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value);
                      setPoints(newPoints);
                    }} />

                    <div className='riichiTenpaiCheckboxes'>
                      <label>
                        <input type="checkbox" 
                          checked={riichiTenpaiStatus[index] === 1} 
                          onChange={(e) => e.target.checked ? declareRiichi(index) : undeclareRiichi(index)}
                        />
                          Riichi
                        </label>
                      <label>
                        <input type="checkbox"
                          checked={riichiTenpaiStatus[index] === 2} 
                          disabled={riichiTenpaiStatus[index] === 1}
                          onChange={(e) => e.target.checked ? markTenpai(index) : unmarkTenpai(index)}
                        />
                          Tenpai
                        </label>
                    </div>

                    <div className='winButtons'>
                      <button onClick={() => {
                        setPossibleWinner(player);
                        setPossibleLoser(toimen.uuid);
                        setRonModalOpen(true);
                      }}>Ron {toimen.name}</button>
                      <div className='middleRonButtons'>
                        <button onClick={() => {
                          setPossibleWinner(player);
                          setPossibleLoser(kamicha.uuid);
                          setRonModalOpen(true);
                        }}>Ron {kamicha.name}</button>
                        <button onClick={() => {
                          setPossibleWinner(player);
                          setPossibleLoser(shimocha.uuid);
                          setRonModalOpen(true);
                        }}>Ron {shimocha.name}</button>
                      </div>
                      <button onClick={() => {
                        setPossibleWinner(player);
                        setTsumoModalOpen(true);
                      }}>Tsumo</button>
                    </div>
                  </div>
                )
              })}
            </div>

            <hr />

            <div className={'handHistory'}>
              <h2>Hand History</h2>

              <table>
               <tbody>
                  <tr>
                    <th>Round</th>
                    <th>Honba</th>
                    <th>Riichi Sticks</th>
                    <th>{users.find(user => user.uuid === players[0]).name}</th>
                    <th>{users.find(user => user.uuid === players[1]).name}</th>
                    <th>{users.find(user => user.uuid === players[2]).name}</th>
                    <th>{users.find(user => user.uuid === players[3]).name}</th>
                    <th></th>
                  </tr>
                  {gameHistory.map((gameRecord, index) => {
                    const getPointsString = (playerIdx) => {
                      let diff = null;
                      const curPoints = gameRecord.players[playerIdx].points;
                      if (index !== 0) {
                        const prevPoints = gameHistory[index - 1].players[playerIdx].points;

                        if (curPoints !== prevPoints) {
                          const delta = curPoints - prevPoints;
                          diff = <span style={{color: delta < 0 ? 'red' : 'green'}}>{` (${delta < 0 ? '-' : '+'}${Math.abs(delta / 100)})`}</span>
                        }
                      }
                      return <>
                        {gameRecord.players[playerIdx].points.toLocaleString()}
                        {diff}
                      </>
                    }
                    
                    return (
                      <tr>
                        <td>{gameRecord.gameOver ? 'Game Over' : roundString(gameRecord.round)}</td>
                        <td>{gameRecord.gameOver ? '' : gameRecord.honba}</td>
                        <td>{gameRecord.gameOver ? '' : gameRecord.riichiSticks}</td>
                        <td>{getPointsString(0)}</td>
                        <td>{getPointsString(1)}</td>
                        <td>{getPointsString(2)}</td>
                        <td>{getPointsString(3)}</td>
                        <td><button onClick={() => revertToState(gameRecord, index)}>Revert to this state</button></td>
                      </tr>
                    );
                  })}
                  </tbody>
              </table>
            </div>
          </section>
          
        )}

        <div className={'modal ' + (tsumoModalOpen ? '' : 'inactive')} onClick={() => {
          setTsumoModalOpen(false);
          setPossibleWinner(null);
        }}>
          <div className='modalContent' onClick={(e) => e.stopPropagation()}>
            <h3>{users.find(user => user.uuid === possibleWinner)?.name} Tsumo</h3>

            <div className='tsumoGrid'>
              <span></span>
              <span>20 fu</span>
              <span>25 fu</span>
              <span>30 fu</span>
              <span>40 fu</span>
              <span>50 fu</span>
              <span>60 fu</span>

              <span>1 han</span>
              <span>-</span>
              <span>-</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(300, 500)}>{isPossibleWinnerDealer ? '500 all' : '300/500'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(400, 700)}>{isPossibleWinnerDealer ? '700 all' : '400/700'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(400, 800)}>{isPossibleWinnerDealer ? '800 all' : '400/800'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(500, 1000)}>{isPossibleWinnerDealer ? '1000 all' : '500/1000'}</span>

              <span>2 han</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(400, 700)}>{isPossibleWinnerDealer ? '700 all' : '400/700'}</span>
              <span>-</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(500, 1000)}>{isPossibleWinnerDealer ? '1000 all' : '500/1000'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(700, 1300)}>{isPossibleWinnerDealer ? '1300 all' : '700/1300'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(800, 1600)}>{isPossibleWinnerDealer ? '1600 all' : '800/1600'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1000, 2000)}>{isPossibleWinnerDealer ? '2000 all' : '1000/2000'}</span>

              <span>3 han</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(700, 1300)}>{isPossibleWinnerDealer ? '1300 all' : '700/1300'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(800, 1600)}>{isPossibleWinnerDealer ? '1600 all' : '800/1600'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1000, 2000)}>{isPossibleWinnerDealer ? '2000 all' : '1000/2000'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1300, 2600)}>{isPossibleWinnerDealer ? '2600 all' : '1300/2600'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1600, 3200)}>{isPossibleWinnerDealer ? '3200 all' : '1600/3200'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(2000, 4000)}>Mangan</span>

              <span>4 han</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1300, 2600)}>{isPossibleWinnerDealer ? '2600 all' : '1300/2600'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1600, 3200)}>{isPossibleWinnerDealer ? '3200 all' : '1600/3200'}</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 4'}} onClick={() => handleTsumo(2000, 4000)}>Mangan {isPossibleWinnerDealer ? '(4000 all)' : '(2000/4000)'}</span>

              <span>5 han</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 6'}} onClick={() => handleTsumo(2000, 4000)}>Mangan {isPossibleWinnerDealer ? '(4000 all)' : '(2000/4000)'}</span>

              <span>6-7 han</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 6'}} onClick={() => handleTsumo(3000, 6000)}>Haneman {isPossibleWinnerDealer ? '(6000 all)' : '(3000/6000)'}</span>

              <span>8-10 han</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 6'}} onClick={() => handleTsumo(4000, 8000)}>Baiman {isPossibleWinnerDealer ? '(8000 all)' : '(4000/8000)'}</span>

              <span>11-12 han</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 6'}} onClick={() => handleTsumo(6000, 12000)}>Haneman {isPossibleWinnerDealer ? '(12000 all)' : '(6000/12000)'}</span>

              <span>13 han</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 6'}} onClick={() => handleTsumo(8000, 16000)}>Yakuman {isPossibleWinnerDealer ? '(16000 all)' : '(8000/16000)'}</span>
            </div>

            <hr></hr>
            <p>Or, pick from some more rarer options below:</p>

            <div className='tsumoGridRare'>
              <span></span>
              <span>70 fu</span>
              <span>80 fu</span>
              <span>90 fu</span>
              <span>100 fu</span>
              <span>110 fu</span>

              <span>1 han</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(600, 1200)}>{isPossibleWinnerDealer ? '1200 all' : '600/1200'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(700, 1300)}>{isPossibleWinnerDealer ? '1300 all' : '700/1300'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(800, 1500)}>{isPossibleWinnerDealer ? '1500 all' : '800/1500'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(800, 1600)}>{isPossibleWinnerDealer ? '1600 all' : '800/1600'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(900, 1800)}>{isPossibleWinnerDealer ? '1800 all' : '900/1800'}</span>

              <span>2 han</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1200, 2300)}>{isPossibleWinnerDealer ? '2300 all' : '1200/2300'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1300, 2600)}>{isPossibleWinnerDealer ? '2600 all' : '1300/2600'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1500, 2900)}>{isPossibleWinnerDealer ? '2900 all' : '1500/2900'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1600, 3200)}>{isPossibleWinnerDealer ? '3200 all' : '1600/3200'}</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(1800, 3600)}>{isPossibleWinnerDealer ? '3600 all' : '1800/3600'}</span>
            
              <span>Yakuman</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(16000, 32000)}>2x</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(24000, 48000)}>3x</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(32000, 64000)}>4x</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(40000, 80000)}>5x</span>
              <span className={'modalClickable'} onClick={() => handleTsumo(48000, 96000)}>6x</span>
            </div>
          </div>
        </div>

        <div className={'modal ' + (ronModalOpen ? '' : 'inactive')} onClick={() => {
          setRonModalOpen(false);
          setPossibleWinner(null);
          setPossibleLoser(null);
        }}>
          <div className='modalContent' onClick={(e) => e.stopPropagation()}>
            <h3>{users.find(user => user.uuid === possibleLoser)?.name} ⇒ {users.find(user => user.uuid === possibleWinner)?.name}</h3>

            <div className='ronGrid'>
              <span></span>
              <span>20 fu</span>
              <span>25 fu</span>
              <span>30 fu</span>
              <span>40 fu</span>
              <span>50 fu</span>
              <span>60 fu</span>

              <span>1 han</span>
              <span>-</span>
              <span>-</span>
              <span className={'modalClickable'} onClick={() => handleRon(1000, 1500)}>{isPossibleWinnerDealer ? '1500' : '1000'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(1300, 2000)}>{isPossibleWinnerDealer ? '2000' : '1300'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(1600, 2400)}>{isPossibleWinnerDealer ? '2400' : '1600'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(2000, 2900)}>{isPossibleWinnerDealer ? '2900' : '2000'}</span>

              <span>2 han</span>
              <span className={'modalClickable'} onClick={() => handleRon(1300, 2000)}>{isPossibleWinnerDealer ? '2000' : '1300'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(1600, 2400)}>{isPossibleWinnerDealer ? '2400' : '1600'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(2000, 2900)}>{isPossibleWinnerDealer ? '2900' : '2000'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(2600, 3900)}>{isPossibleWinnerDealer ? '3900' : '2600'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(3200, 4600)}>{isPossibleWinnerDealer ? '4600' : '3200'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(3900, 5800)}>{isPossibleWinnerDealer ? '5800' : '3900'}</span>

              <span>3 han</span>
              <span className={'modalClickable'} onClick={() => handleRon(2600, 3900)}>{isPossibleWinnerDealer ? '3900' : '2600'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(3200, 4800)}>{isPossibleWinnerDealer ? '4800' : '3200'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(3900, 5800)}>{isPossibleWinnerDealer ? '5800' : '3900'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(5200, 7700)}>{isPossibleWinnerDealer ? '7700' : '5200'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(6400, 9600)}>{isPossibleWinnerDealer ? '9600' : '6400'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(8000, 12000)}>Mangan</span>

              <span>4 han</span>
              <span className={'modalClickable'} onClick={() => handleRon(5200, 7700)}>{isPossibleWinnerDealer ? '7700' : '5200'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(6400, 9600)}>{isPossibleWinnerDealer ? '9600' : '6400'}</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 4'}} onClick={() => handleRon(8000, 12000)}>Mangan {isPossibleWinnerDealer ? '(12000)' : '(8000)'}</span>

              <span>5 han</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 6'}} onClick={() => handleRon(8000, 12000)}>Mangan {isPossibleWinnerDealer ? '(12000)' : '(8000)'}</span>

              <span>6-7 han</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 6'}} onClick={() => handleRon(12000, 18000)}>Haneman {isPossibleWinnerDealer ? '(18000)' : '(12000)'}</span>

              <span>8-10 han</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 6'}} onClick={() => handleRon(16000, 24000)}>Baiman {isPossibleWinnerDealer ? '(24000)' : '(16000)'}</span>

              <span>11-12 han</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 6'}} onClick={() => handleRon(24000, 36000)}>Haneman {isPossibleWinnerDealer ? '(36000)' : '(24000)'}</span>

              <span>13 han</span>
              <span className={'modalClickable'} style={{gridColumn: 'span 6'}} onClick={() => handleRon(32000, 48000)}>Yakuman {isPossibleWinnerDealer ? '(48000)' : '(32000)'}</span>
            </div>

            <hr></hr>
            <p>Or, pick from some more rarer options below:</p>

            <div className='tsumoGridRare'>
              <span></span>
              <span>70 fu</span>
              <span>80 fu</span>
              <span>90 fu</span>
              <span>100 fu</span>
              <span>110 fu</span>

              <span>1 han</span>
              <span className={'modalClickable'} onClick={() => handleRon(2300, 3400)}>{isPossibleWinnerDealer ? '3400' : '2300'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(2600, 3900)}>{isPossibleWinnerDealer ? '3900' : '2600'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(2900, 4400)}>{isPossibleWinnerDealer ? '4400' : '2900'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(3200, 4800)}>{isPossibleWinnerDealer ? '4800' : '3200'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(3600, 5300)}>{isPossibleWinnerDealer ? '5300' : '3600'}</span>

              <span>2 han</span>
              <span className={'modalClickable'} onClick={() => handleRon(4500, 6800)}>{isPossibleWinnerDealer ? '6800' : '4500'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(5200, 7700)}>{isPossibleWinnerDealer ? '7700' : '5200'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(5800, 8700)}>{isPossibleWinnerDealer ? '8700' : '5800'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(6400, 9600)}>{isPossibleWinnerDealer ? '9600' : '6400'}</span>
              <span className={'modalClickable'} onClick={() => handleRon(7100, 10600)}>{isPossibleWinnerDealer ? '10600' : '7100'}</span>

              <span>Yakuman</span>
              <span className={'modalClickable'} onClick={() => handleRon(64000, 96000)}>2x</span>
              <span className={'modalClickable'} onClick={() => handleRon(96000, 144000)}>3x</span>
              <span className={'modalClickable'} onClick={() => handleRon(128000, 192000)}>4x</span>
              <span className={'modalClickable'} onClick={() => handleRon(160000, 240000)}>5x</span>
              <span className={'modalClickable'} onClick={() => handleRon(192000, 288000)}>6x</span>
            </div>
          </div>
        </div>

        <div className={'modal ' + (ryuukyokuModalOpen ? '' : 'inactive')} onClick={() => {
          setRyuukyokuModalOpen(false);
        }}>
          <div className='ryuukyokuModalContent modalContent' onClick={(e) => e.stopPropagation()}>
            <h3>Ryuukyoku - Who was tenpai?</h3>

            <div className='playerCards'>
              {players.map((player, index) => {
                const user = users.find(user => user.uuid === player);

                return <label className='playerCard'>
                  <h3>{user.name}</h3>
                    <input type="checkbox" 
                      checked={riichiTenpaiStatus[index] !== 0} 
                      onChange={(e) =>{
                        e.target.checked ? markTenpai(index) : unmarkTenpai(index);
                      }}
                    />
                      Tenpai
                  </label>
              })}
            </div>

            <button className='ryuukyokuButton' onClick={handleRyuukyoku}>Submit</button>
          </div>
        </div>
      </section>
    </div>
  );
}


export default Admin;
 