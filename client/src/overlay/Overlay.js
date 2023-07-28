import React from "react";
import './Overlay.css';
import { useParams } from 'react-router-dom';
import { useSpringValue, animated } from '@react-spring/web'

const Overlay = () => {
  const [ws, setWs] = React.useState(null);
  const { overlayId } = useParams();
  const [players, setPlayers] = React.useState([]);
  const previousPlayers = React.useRef();
  const [round, setRound] = React.useState(1);
  const [honba, setHonba] = React.useState(0);
  const [riichiSticks, setRiichiSticks] = React.useState(0);
  const [riichiTenpaiStatus, setRiichiTenpaiStatus] = React.useState([0,0,0,0]);
  const [dora, setDora] = React.useState([]);
  const [gameOver, setGameOver] = React.useState(false);
  const [gameActive, setGameActive] = React.useState(false);

  const [animatingPlayerOne, setAnimatingPlayerOne] = React.useState(0);
  const [animatingPlayerTwo, setAnimatingPlayerTwo] = React.useState(0);
  const [animatingPlayerThree, setAnimatingPlayerThree] = React.useState(0);
  const [animatingPlayerFour, setAnimatingPlayerFour] = React.useState(0);
  
  const playerOneScore = useSpringValue(0, {
    onRest: () => setAnimatingPlayerOne(0),
    onResolve: () => setAnimatingPlayerOne(0),
  });
  const playerTwoScore = useSpringValue(0, {
    onRest: () => setAnimatingPlayerTwo(0),
    onResolve: () => setAnimatingPlayerTwo(0),
  });
  const playerThreeScore = useSpringValue(0, {
    onRest: () => setAnimatingPlayerThree(0),
    onResolve: () => setAnimatingPlayerThree(0),
  });
  const playerFourScore = useSpringValue(0, {
    onRest: () => setAnimatingPlayerFour(0),
    onResolve: () => setAnimatingPlayerFour(0),
  });


  React.useEffect(() => {
    let protocol;
    if (window.location.hostname === 'localhost') {
      protocol = 'ws';
    } else {
      protocol = 'wss';
    }
    const socket = new WebSocket(`${protocol}://${window.location.hostname}:443/${overlayId}`);

    setWs(socket);

    socket.addEventListener("message", (event) => {
      handleWebsocketMessage(event.data);
    })
  }, []);

  const handleWebsocketMessage = (data) => {
    const parsed = JSON.parse(data);

    if (parsed.gameActive === false) {
      setGameActive(false);
      return;
    }

    setPlayers((players) => {
      previousPlayers.current = players;
      return parsed.players
    });
    setRound(parsed.round);
    setHonba(parsed.honba);
    setRiichiSticks(parsed.riichiSticks);
    setRiichiTenpaiStatus(parsed.riichiTenpaiStatus);
    setDora(parsed.dora);
    setGameOver(parsed.gameOver);
    setGameActive(parsed.gameActive);
  }

  React.useEffect(() => {
    const lastScores = previousPlayers.current;
 
    if (players?.[0]?.points !== lastScores?.[0]?.points) {
      setAnimatingPlayerOne(players?.[0].points < lastScores[0]?.points ? -1 : 1);
    }
    if (players?.[1]?.points !== lastScores?.[1]?.points) {
      setAnimatingPlayerTwo(players?.[1].points < lastScores[1]?.points ? -1 : 1);
    }
    if (players?.[2]?.points !== lastScores?.[2]?.points) {
      setAnimatingPlayerThree(players?.[2].points < lastScores[2]?.points ? -1 : 1);
    }
    if (players?.[3]?.points !== lastScores?.[3]?.points) {
      setAnimatingPlayerFour(players?.[3].points < lastScores[3]?.points ? -1 : 1);
    }

    if (players.length === 4) {
      playerOneScore.start(players[0].points);
      playerTwoScore.start(players[1].points);
      playerThreeScore.start(players[2].points);
      playerFourScore.start(players[3].points);
    }
  }, [players, previousPlayers.current]);

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

  return (
    <div className={'overlayContainer ' + (gameActive ? '' : 'gameInactive')}>
      <section className='gameStatusOverlay'>
        <h2>{gameOver ? 'Game Over' : roundString(round)}</h2>
        <div className='sticksContainer'>
          <div className='stickPairing'>
            <div className='stick riichiStick'>
              <span></span>
            </div>
            {riichiSticks}
          </div>
          <div className='stickPairing'>
            <div className='stick honbaStick'>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <div style={{flexBasis: '100%', height:0}} />
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            {honba}
          </div>
        </div>
        <div className='doraContainer'>
          {dora.map((tile, index) => <Tile tile={tile} key={`${tile}-${index}`} />)}
        </div>
      </section>

      <section className='playerPointsOverlay'>
        <div className='playerPointsOverlayCardContainer'>
          {players.map((player, index) => {
            const status = riichiTenpaiStatus[index];
            const isDealer = (round - 1 % 4) === index;

            let pointRef;
            let animationRef;

            if (index === 0) {
              pointRef = playerOneScore;
              animationRef = animatingPlayerOne;
            } else if (index === 1) {
              pointRef = playerTwoScore;
              animationRef = animatingPlayerTwo;
            } else if (index === 2) {
              pointRef = playerThreeScore;
              animationRef = animatingPlayerThree;
            } else if (index === 3) {
              pointRef = playerFourScore;
              animationRef = animatingPlayerFour;
            }

            return <div key={player.uuid}>
              <div className={'overlayPlayerIndicators'}>
                <div className={'overlayRiichiIndicator nonDealer ' + ((status === 1 && !isDealer) ? '': 'inactive')}><span>Riichi</span></div>
                <div className={'overlayTenpaiIndicator nonDealer ' + ((status === 2 && !isDealer) ? '': 'inactive')}><span>Tenpai</span></div>
                <div className={'overlayDealerIndicator ' + ((isDealer ? '' : 'inactive'))}><span>Dealer</span></div>
                <div className={'overlayRiichiIndicator dealer ' + ((status === 1 && isDealer) ? '': 'inactive')}><span>Riichi</span></div>
                <div className={'overlayTenpaiIndicator dealer ' + ((status === 2 && isDealer) ? '': 'inactive')}><span>Tenpai</span></div>
              </div>
                <div className='playerPointsOverlayCard'>
                  <div className='playerCoreInfo'>
                    <animated.h1 className={animationRef !== 0 ? (animationRef === 1 ? 'positive' : 'negative') : ''}>{pointRef.to(val => Math.floor(val).toLocaleString())}</animated.h1>
                    <h3>{player.name}</h3>
                  </div>
                  <div className={'playerPointsSubtitleContainer ' + (player.subtitle?.length === 0 ? 'hidden' : '')}>
                    <p>{player.subtitle?.length === 0 ? 'x' : player.subtitle}</p>
                  </div>
                </div>
              </div>
          })}
        </div>
      </section>
    </div>
  );
}

const Tile = ({tile}) => {
  return (
    <div className="tileContainer">
      <img className="tile" src={require(`../tiles/${tile}.png`)} />
    </div>
  )
}

export default Overlay;