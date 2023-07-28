import React from "react";
import './App.css';
import {useNavigate} from 'react-router-dom';

const FIRST_ADJECTIVES = [
  'adaptable',
  'picayune',
  'capricious',
  'capable',
  'truthful',
  'foreign',
  'obscene',
  'wiry',
  'living',
  'deranged',
  'irate',
  'gentle',
  'frail',
  'normal',
  'thin',
  'wrong',
  'talented',
  'pastoral',
  'straight',
  'hallowed',
  'meek',
  'possessive',
  'hysterical',
  'glorious',
  'learned',
  'voracious',
  'scarce',
  'callous',
  'wary',
  'efficient',
  'blue',
  'apathetic',
  'right',
  'united',
  'rightful',
  'tart',
  'graceful',
  'wiggly',
  'murky',
  'guttural',
  'screeching',
  'aback',
  'hospitable',
  'vigorous',
  'plant',
  'wistful',
  'round',
  'mean',
  'ubiquitous',
  'harsh',
  'panoramic',
  'absorbing',
  'complex',
  'childlike',
  'skinny',
  'happy',
  'crowded',
  'asleep',
  'spicy',
  'sorry',
  'whispering',
  'rhetorical',
  'agreeable',
  'industrious',
  'conscious',
  'daily',
  'busy',
  'cagey',
  'penitent',
  'forgetful',
  'squealing',
  'clumsy',
  'full',
  'reasonable',
  'free',
];

const SECOND_ADJECTIVES = [
  'yielding',
  'consistent',
  'understood',
  'moaning',
  'puzzling',
  'swift',
  'coordinated',
  'sour',
  'severe',
  'sneaky',
  'parsimonious',
  'envious',
  'special',
  'splendid',
  'impolite',
  'cooperative',
  'scarce',
  'right',
  'decorous',
  'rotten',
  'critical',
  'cumbersome',
  'tested',
  'guttural',
  'thoughtless',
  'mental',
  'happy',
  'vague',
  'remarkable',
  'boring',
  'barbarous',
  'oceanic',
  'juvenile',
  'dark',
  'beautiful',
  'aggressive',
  'tasty',
  'scrawny',
  'ashamed',
  'needy',
  'annoying',
  'therapeutic',
  'melodic',
  'little',
  'shocking',
  'whispering',
  'grubby',
  'obeisant',
  'mundane',
  'damp',
  'permissible',
  'versed',
  'exclusive',
  'spurious',
  'closed',
  'bawdy',
  'dispensable',
  'supreme',
  'tranquil',
  'disillusioned',
  'rude',
  'better',
  'technical',
  'furry',
  'imported',
  'waggish',
  'emotional',
  'imaginary',
  'lopsided',
  'immense',
  'heavy',
  'wiry',
  'loving',
  'flimsy',
  'curvy'
];

function App() {

  const navigate = useNavigate();

  const createNewStream = async () => {
    const generateNewId = () => {
      const generatedNewId = [];
      generatedNewId.push(FIRST_ADJECTIVES[Math.floor(Math.random()*FIRST_ADJECTIVES.length)]);
      generatedNewId.push(SECOND_ADJECTIVES[Math.floor(Math.random()*SECOND_ADJECTIVES.length)]);
      generatedNewId.push(`${Math.floor(Math.random() * 9) + 1}${['s','m','p'][Math.floor(Math.random()*3)]}`);
      return generatedNewId.join('-');
    }

    for (let i = 0; i < 20; i++) {
      const newId = generateNewId();
      if ((await (await fetch(`/check-availability/${newId}`)).json()).available) {
        navigate(`/admin/${newId}`);
        break;
      }
    }
  }

  const [inputId, setInputId] = React.useState('');

  const isOverlayKeyish = (() => {
    const parts = inputId.split('-');
    if (parts.length !== 3) {
      return false;
    }

    const [firstAdjective, secondAdjective, tile] = parts;

    if (!FIRST_ADJECTIVES.includes(firstAdjective)) {
      return false;
    }

    if (!SECOND_ADJECTIVES.includes(secondAdjective)) {
      return false;
    }

    if (tile.length !== 2) {
      return false;
    }

    const number = parseInt(tile.charAt(0));
    if (number < 1 || number > 9 || Number.isNaN(number)) {
      return false;
    }

    if (!['s','p','m'].includes(tile.charAt(1))) {
      return false;
    }

    return true;
  })();

  const loadAdmin = () => {
    navigate(`/admin/${inputId}`);
  }

  const loadOverlay = () => {
    navigate(`/overlay/${inputId}`);
  }
  
  return (
    <div className="App">
      <header className="App-header">
        <h3>Riichi Mahjong Overlay</h3>
        <p>This app uses WebSockets and outputs an overlay meant for use with OBS for enhancing an IRL riichi mahjong stream. It make break when I redeploy, but uses local storage as a backup.</p>
        <p>To get started, click the "create new stream" button below:</p>
        <button onClick={createNewStream}>Create New Stream</button>
        <p>Or, if you know your overlay ID, you can insert that here and load the admin/overlay UI:</p>
        <input placeholder={'Overlay ID'} value={inputId} onChange={e => setInputId(e.target.value)}></input>
        <button disabled={!isOverlayKeyish} onClick={loadAdmin}>Load Admin</button>
        <button disabled={!isOverlayKeyish} onClick={loadOverlay}>Load Overlay</button>
      </header>
    </div>
  );
}

export default App;
