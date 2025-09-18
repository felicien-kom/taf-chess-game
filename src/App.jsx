
import './App.css';
import "./styles/style.css";
import Chessboard from './components/Chessboard';
import { useEffect, useRef, useState } from 'react';
import { piecesImages, getTotalMaterial } from './utils/pieces';

function App() {
  const scrollRef = useRef(null);
  const [data, setData] = useState([]);
  const [diff, setDiff] = useState(0);
  const [totalMaterial, setTotalMaterial] = useState({
    white: [],
    black: []
  });
  const [trait, setTrait] = useState("white");

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth;
    }
  }, [data]);

  useEffect(() => {
    setDiff(getTotalMaterial(totalMaterial.white) - getTotalMaterial(totalMaterial.black));
  }, [totalMaterial]);

  return (
      <>
      <div className="game-board">
        <div className="history-box" ref={scrollRef}>
          {data && data.map((item, index) => (
              <div key={index} className={(index % 2 === 0) ? " new-box" :""}>
                {(index % 2 === 0) && (
                  <span className='big-turn'>{parseInt(index / 2) + 1}.</span>
                )}
                <span key={index}>{item.stringForm}</span>
              </div>
          ))}
        </div>
        <div className={"black-box" + ((trait === "black") ? " has-trait" : "")}>
          <span>Black</span>
          <span>
            {totalMaterial.black.map((item, index) => (
              <span key={index}>{piecesImages[item][3]}</span>
            ))}
            {(diff < 0) && (
              <span>&nbsp;+{(-1) * diff}</span>
            )}
          </span>
        </div>
        <Chessboard setData={setData} toggleTurn={setTrait} setTotalMaterial={setTotalMaterial} />
        <div className={"white-box" + ((trait === "white") ? " has-trait" : "")}>
          <span>White</span>
          <span>
            {totalMaterial.white.map((item, index) => (
              <span key={index}>{piecesImages[item][3]}</span>
            ))}
            {(diff > 0) && (
              <span>&nbsp;+{diff}</span>
            )}
          </span>
        </div>
      </div>
      </>
  );
};

export default App;