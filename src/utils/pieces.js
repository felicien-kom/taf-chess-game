
import blackPawn from "../assets/pieces/bP.svg";
import blackKnight from "../assets/pieces/bN.svg";
import blackBishop from "../assets/pieces/bB.svg";
import blackRook from "../assets/pieces/bR.svg";
import blackQueen from "../assets/pieces/bQ.svg";
import blackKing from "../assets/pieces/bK.svg";

import whitePawn from "../assets/pieces/wP.svg";
import whiteKnight from "../assets/pieces/wN.svg";
import whiteBishop from "../assets/pieces/wB.svg";
import whiteRook from "../assets/pieces/wR.svg";
import whiteQueen from "../assets/pieces/wQ.svg";
import whiteKing from "../assets/pieces/wK.svg";

export const piecesImages = {
    "bP": [blackPawn, '', '', '\u2659', 1],//\u265F
    "bN": [blackKnight, '\u265E', '\u2658', '\u2658', 3],
    "bB": [blackBishop, '\u265D', '\u2657', '\u2657', 3],
    "bR": [blackRook, '\u265C', '\u2656', '\u2656', 5],
    "bQ": [blackQueen, '\u265B', '\u2655', '\u2655', 9],
    "bK": [blackKing, '\u265A', '\u2654', '\u2654', null],
    "wK": [whiteKing, '\u2654', '\u265A', '\u265A', null],
    "wQ": [whiteQueen, '\u2655', '\u265B', '\u265B', 9],
    "wR": [whiteRook, '\u2656', '\u265C', '\u265C', 5],
    "wB": [whiteBishop, '\u2657', '\u265D', '\u265D', 3],
    "wN": [whiteKnight, '\u2658', '\u265E', '\u265E', 3],
    "wP": [whitePawn, '', '', '\u265F', 1]//\u2659
};

export const getTotalMaterial = (tab) => {
    let result = 0;
    for (let pos in tab) {
        result += piecesImages[tab[pos]][4];
    }
    return result;
}