import "../styles/chessboard.css";
import { useEffect, useState } from "react";
import { piecesImages } from "../utils/pieces";

const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const numbers = ['1', '2', '3', '4', '5', '6', '7', '8'];

function constructChessBoard() {
    const l = [...letters];
    const n = [...numbers].reverse();
    let result = [];
    for (let i in n) {
        result.push([]);
        for (let j in l) {
            result[i].push(l[j] + '' + n[i]);
        }
    }

    // console.log(result);
    return result;
}

function giveColor(row, column) {
    if (row %2 == 0) {
        return (column % 2 == 0) ? "white" : "black";
    } else {
        return (column % 2 == 0) ? "black" : "white";
    }
}

const base = constructChessBoard();
const initialBoard = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
];

// const initialBoard = [
//     [null, null, null, null, null, null, null, 'bK'],
//     ['wP', null, null, null, null, 'bR', null, null],
//     [null, null, null, null, null, null, 'wQ', 'wK'],
//     [null, null, null, null, null, null, null, null],
//     [null, null, null, null, null, null, null, null],
//     [null, null, null, null, null, null, null, null],
//     [null, null, null, null, null, null, null, null],
//     [null, null, null, null, null, null, null, null],
// ];

let castlingRights = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
};

let enPassantTarget = null;
let promotionChoice = null;
let promotionColor = null;
let promotionResolver = null;

function stringFormify(move, hasCaptured) {
    let result = '';
    if (move.piece[1] !== 'P') {
        result += piecesImages[move.piece][2]; // Astuce d'affichage à cause de la couleur blanche
        // console.log(piecesImages[move.piece][2]);
    }
    result += base[move.from.row][move.from.col].toLowerCase();
    result += (hasCaptured) ? "x" : "-";
    result += base[move.to.row][move.to.col].toLowerCase();
    return result;
}

function Chessboard({ setData, toggleTurn, setTotalMaterial }) {
    const [board, setBoard] = useState(initialBoard);
    const [selected, setSelected] = useState(null);
    const [highlightedSquares, setHighlightedSquares] = useState([]);
    const [oldPlace, setOldPlace] = useState(null);
    const [newPlace, setNewPlace] = useState(null);
    const [showPromotionPopUp, setShowPromotionPopUp] = useState(false);
    const [showMate, setShowMate] = useState(false);
    const [turn, setTurn] = useState("white");
    const [check, setCheck] = useState(false);
    const [history, setHistory] = useState([]);// le tableau des coups joués
    const [material, setMaterial] = useState({
        white: [],
        black: []
    });// le tableau des coups joués

    const handleClick = (row, col) => {
        if (selected) {
            if (selected.row === row && selected.col === col) {// Si c'est la même case, on annule la sélection
                setSelected(null);
                setHighlightedSquares([]);
            } else if (
                board[row][col] && (
                    (board[row][col].startsWith('w') && board[selected.row][selected.col].startsWith('w')) ||
                    (board[row][col].startsWith('b') && board[selected.row][selected.col].startsWith('b'))
                )
                ) {
                // Si on sélectionne **une piece** de la même couleur, on switche tout simplement la sélection
                setSelected({ row, col });
                processHighlight(board[row][col], { row, col });
            }
            else {
                movePiece(selected, { row, col });
            }
        } else {
            const piece = board[row][col];
            if (piece) {
                if ((piece.startsWith('w') && turn === "white") || (piece.startsWith('b') && turn === "black")) {
                    // console.log({ row, col });
                    setSelected({ row, col });
                    processHighlight(piece, { row, col });
                }
            }
        }
    }

    const processHighlight = (piece, { row, col }) => {
        // Calcul des coups dispo pour cette pièce pour highlight
        const possibleMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (
                    isMoveValid(piece, { row, col }, { row: r, col: c}, board)
                    // &&
                    // !isInCheck(board, turn) // A laisser car il faudrait tester le check sur le nouveau board simulé
                    // or isMoveValid ne transamet pas ne simulé et il faudrait le reconstruire
                ) {
                    console.log({ row: r, col: c });
                    possibleMoves.push({ row: r, col: c});
                }
            }
        }
        setHighlightedSquares(possibleMoves);
    }

    const askPromotion = () => {
        return new Promise(resolve => {
            promotionResolver = resolve;
            setShowPromotionPopUp(true);
        });
    }

    const movePiece = async (from, to) => {
        const piece = board[from.row][from.col];

        let capturedByEnPassant = null;
        let specialEnPassant = false;
        let specialCastle = false;
        let specialPromotion = false;

        // console.log(piece);
        // Vérifier que le coup est valide selon les règles de la pièce
        if (!isMoveValid(piece, from, to, board)) {
            setSelected(null);
            setHighlightedSquares([]);
            return;
        }

        // Simuler le coup pour vérifier si (bien que isMoveValid) n'expose pas son roi en échec
        const newBoard = board.map(r => [...r]);// Copie du tableau
        // console.log(newBoard);
        // console.log(piece);

        // Cas du roque : en fait, on déplace deux pièces en une seule fois
        if (piece.endsWith("K") && from.row === to.row && Math.abs(to.col - from.col) === 2) {
            if (to.col > from.col) {
                // petit roque
                newBoard[from.row][6] = piece;// le roi
                newBoard[from.row][5] = newBoard[from.row][7];// la tour
                // newBoard[from.row][from.col] = null;
                newBoard[from.row][7] = null;
            } else {
                // grand roque
                newBoard[from.row][2] = piece;// le roi
                newBoard[from.row][3] = newBoard[from.row][0];// la tour
                // newBoard[from.row][from.col] = null;
                newBoard[from.row][0] = null;
            }
            specialCastle = true;
        } else if (piece.endsWith("P") && Math.abs(to.col - from.col) === 1 && !board[to.row][to.col]) {// Cas de la prise en passant
            newBoard[to.row][to.col] = piece;
            // newBoard[from.row][from.col] = null;
            capturedByEnPassant = newBoard[from.row][from.col + ((to.col > from.col) ? 1 : -1)];
            newBoard[from.row][from.col + ((to.col > from.col) ? 1 : -1)] = null;
            specialEnPassant = true;
        } else if ((piece === 'wP' && to.row === 0) || (piece === 'bP' && to.row === 7)) {// gestion promotion du pion
            promotionColor = (piece.startsWith('w')) ? "white" : "black";
            promotionChoice = await askPromotion();
            setShowPromotionPopUp(false);
            // let choice = prompt('Enter your promotion choice :\n1- Queen\n2- Knight\n3- Rook\n4-Bishop');
            // let choices = ['Q', 'N', 'R', 'B'];
            // promotionChoice = choices[parseInt(choice) - 1];
            newBoard[to.row][to.col] = piece[0] + '' + promotionChoice;// le roi
            // newBoard[from.row][from.col] = null;
            promotionChoice = null;
            promotionColor = null;
            specialPromotion = true;
        } else {// déplacement classique
            newBoard[to.row][to.col] = piece;
            // newBoard[from.row][from.col] = null;
        }
        newBoard[from.row][from.col] = null;// Cette ligne est toujours executée, on a deplacé la piece

        // Mise à jour des droits de roque
        // Si le roi bouge, c'est fini pour le roque
        if (piece === "wK") { castlingRights.white = { kingSide: false, queenSide: false }; }
        if (piece === "bK") { castlingRights.black = { kingSide: false, queenSide: false }; }
        if (from.row === 0 && from.col == 0) { console.log("BLACK QUEEN Side false"); castlingRights.black.queenSide = false; }// tour noire coté dame bouge
        if (from.row === 0 && from.col == 7) { console.log("BLACK KING Side false"); castlingRights.black.kingSide = false; }// tour noire coté roi bouge
        if (from.row === 7 && from.col == 0) { console.log("WHITE QUEEN Side false"); castlingRights.white.queenSide = false; }// tour blanche coté dame bouge
        if (from.row === 7 && from.col == 7) { console.log("WHITE KING Side false"); castlingRights.white.kingSide = false; }// tour blanche coté roi bouge

        // Indice en passant
        enPassantTarget = null;
        if (piece.endsWith('P')) {
            if (Math.abs(from.row - to.row) === 2) {
                enPassantTarget = { row: (from.row + to.row) / 2, col: from.col }
            }
        }

        // Si le roi du joueur est en échec, le coup n'est pas valide
        // Gere dejà la logique de le roi ne doit pas ***attérir*** sur une case d'echec pour le roque
        if (isInCheck(newBoard, turn)) {
            // alert('Roi en echec !!!');
            // console.log(isInCheck(newBoard, turn));
            console.log('Roi en echec !!!');
            setSelected(null);
            setHighlightedSquares([]);
            return;
        }

        /** A PARTIR D'ICI TOUT A ETE VERIFIE ET LE COUP EST VALIDE ET EXECUTE */

        const target = board[to.row][to.col];
        const move = {
            piece: piece,
            from: {...from},
            to: {...to},
            capture: target || capturedByEnPassant || null,
            special: null,
            stringForm: '',
            prevCastlingRights: {...castlingRights},
            prevEnPassant: enPassantTarget
        };

        if (specialCastle) { move.special = "castle"; }
        if (specialEnPassant) { move.special = "enPassant"; }
        if (specialPromotion) { move.special = "promotion"; }

        const hasCapturedString = (target || capturedByEnPassant) ? "x" : "";
        move.stringForm = stringFormify(move, hasCapturedString);

        setHistory(prev => [...prev, move]);// Ajout du coup à l'historique
        if (target) {
            setMaterial(prev => {
                if (turn === "white") {
                    const temp = [...prev.white];
                    temp.push(target);
                    console.log(temp);
                    return {...prev, white: [...temp]}
                } else {
                    const temp = [...prev.black];
                    temp.push(target);
                    console.log(temp);
                    return {...prev, black: [...temp]}
                }
            });
        }

        // Si le coup est valide, on print la trace officielle
        // console.log(turn + " : " + piecesImages[piece][1] + '' + hasCapturedString + base[to.row][to.col]);
        capturedByEnPassant = false; //On le remet à zéro ici
        // Si le coup est valide, on l'applique
        // console.log(board);
        // console.log(newBoard);

        // Si le coup été validé, alors on le montre visuellement
        setOldPlace({ row: from.row, col: from.col });
        setNewPlace({ row: to.row, col: to.col });
        setCheck(false);

        setBoard(newBoard);
        setSelected(null);
        setHighlightedSquares([]);

        // Le tour passe au suivant
        const nextTurn = turn === "white" ? "black" : "white";
        setTurn(nextTurn);

        // Vérifier si l'adversaire est à présent en echec ou en echec et mat
        if (isInCheck(newBoard, nextTurn)) {
            setCheck(true);
            if (isInCheckMate(newBoard, nextTurn)) {
                console.log('ECHEC ET MAT !!!!!!!!!!!!');
                setShowMate(true);
            } else {
                console.log('Roi en echec !!!');
            }
        } else {// Si le roi n'est pas en échec, 
            if (!hasAnyLegalMove(newBoard, nextTurn)) {
                // mais n'a aucun mouvement legal, alors c'est pat (stalemate : match nul)
                console.log('STALEMATE ! Partie nulle.');
            }
        }
    }

    const undoLastMove = () => {
        // ************************
        const lastMove = history[history.length - 1];
        if (lastMove && lastMove.capture) {
            console.log(lastMove);
            setMaterial(prev => {
                if (lastMove.piece.startsWith('w')) {
                    const temp = [...prev.white];
                    temp.pop();
                    console.log(temp);
                    return {...prev, white: [...temp]}
                } else {
                    const temp = [...prev.black];
                    temp.pop();
                    console.log(temp);
                    return {...prev, black: [...temp]}
                }
            });
        }
        setHistory(prev => {
            if (prev.length === 0) {
                return prev;// Si on n'a rien fait, on ne change rien
            }

            // const lastMove = prev[prev.length - 1];

            // Restaurer la pièce qui a bougé
            board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
            board[lastMove.to.row][lastMove.to.col] = lastMove.capture || null;// si avait capturé

            // Si c'était une promotion, on restaure le pion
            if (lastMove.special === "promotion") {
                board[lastMove.from.row][lastMove.from.col] = lastMove.piece.startsWith('w') ? "wP" : "bP";
            }

            // Restaurer les droits en passant et roque
            enPassantTarget = lastMove.prevEnPassant;
            castlingRights = lastMove.prevCastlingRights;

            // Si c'était une prise en passant, on restaure le pion capturé
            if (lastMove.special === "enPassant") {
                board[lastMove.to.row][lastMove.to.col] = null;// Annuler tout ici car le en passant exigeait cette case vide
                board[lastMove.from.row][lastMove.to.col] = lastMove.capture;
            }

            // Si c'était un roque, on repositionne la tour
            if (lastMove.special === "castle") {
                if (lastMove.to.col === 6) {
                    // petit roque
                    board[lastMove.to.row][7] =  lastMove.piece[0]+ 'R';/// ????
                    console.log(board[lastMove.to.row][7]);
                    board[lastMove.to.row][5] = null;
                } else if (lastMove.to.col === 2) {
                    // grand roque
                    board[lastMove.to.row][0] = board[lastMove.to.row][3];
                    board[lastMove.to.row][3] = null;
                }
            }

            // On n'oublie pas d'inverser les tours
            const nextTurn = turn === "white" ? "black" : "white";
            setTurn(nextTurn);

            // On verifie si cela mettait quelqu'un en echec
            if (isInCheck(board, nextTurn)) {
                setCheck(true);
            } else {
                setCheck(false);
            }

            return prev.slice(0, -1);// la trace de l'historique en lui meme est modifié
        });
    }

    const hasAnyLegalMove = (board, turn) => {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) { continue; }
                const isWhitePiece = piece.startsWith('w');
                if ((turn === "white" && !isWhitePiece) || (turn === "black" && isWhitePiece)) { continue; }

                // Tester tous les deplacements possibles et verifier 
                // si une configuration est valide et ne met pas le roi en echec
                for (let tr = 0; tr < 8; tr++) {// testRow et testCol
                    for (let tc = 0; tc < 8; tc++) {
                        const to = { row: tr, col: tc };// testOption
                        if (isMoveValid(piece, { row: r, col: c }, to, board)) {
                            // On vérifie si déplacer la piece de r-c à tr-tc peut mettre en échec
                            
                            const newNewBoard = board.map(r => [...r]);
                            newNewBoard[tr][tc] = piece;
                            newNewBoard[r][c] = null;

                            if (!isInCheck(newNewBoard, turn)) {
                                return true;// On a au moins un coup VALIDE qui NE MET PAS en échec
                            }
                        }
                    }
                }
            }
        }

        return false;// Si rien n'a marché alors il n'y a aucun coup légal
    }

    // isMoveValid se concentre sur le déplacement de la pièce, il ne vérifie pas si le coup est "légal" ie
    // si le roi est déjà en echec et n'empeche pas cela, ou si cela met ou laisse le roi en echec, etc
    const isMoveValid = (piece, from, to, board) => {
        const [fromRow, fromCol] = [from.row, from.col];
        const [toRow, toCol] = [to.row, to.col];

        const target = board[toRow][toCol];
        const isWhite = piece.startsWith('w');

        // Avant toute chose, si la case cible a une piece, et donc qu'on veut capturer
        // il est necessaire que la couleur soit opposée
        if (target) {
            const isTargetWhite = target.startsWith('w');
            if (isWhite === isTargetWhite) {
                return false;// Interdit de capturer son coéquipier
            }
        }

        // Vérification du déplacement d'un pion
        if (piece.endsWith('P')) {
            const direction = isWhite ? -1 : 1;
            const startRow = isWhite ? 6 : 1;

            // Avancer d'une case
            // console.log(target);
            if (toCol === fromCol && toRow === fromRow + direction && !target) {
                return true;
            }
            // Avancer de deux cases
            if (fromRow === startRow && toCol === fromCol && toRow === fromRow + 2 * direction && !target && !board[fromRow + direction][fromCol]) {
                return true;
            }

            // Capturer en diagonale
            if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction && target) {
                return true;
            }

            // Cas en passant : case cible vide avec indice en passant
            if (toCol !== fromCol &&
                !target &&
                enPassantTarget && 
                to.row === enPassantTarget.row && 
                to.col === enPassantTarget.col &&
                from.row === enPassantTarget.row - direction
            ) {
                    console.log('special', to, enPassantTarget);
                    return true;
            }

            return false;// Toute autre cas pour cette pièce est invalide
        }

        // Déplcament d'un cavalier
        if (piece.endsWith('N')) {
            const rowDiff = Math.abs(fromRow - toRow);
            const colDiff = Math.abs(fromCol - toCol);
            // On vérifie le mouvement en L
            if((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
                return true;
            }

            return false;// Toute autre cas pour cette pièce est invalide
        }

        // Déplacement d'un fou
        if (piece.endsWith('B')) {
            const rowDiff = Math.abs(fromRow - toRow);
            const colDiff = Math.abs(fromCol - toCol);
            // On vérifie le mouvement en diagonale
            if(rowDiff !== colDiff) {
                return false;
            }
            // On vérifie que le chemin est libre
            const rowStep = toRow > fromRow ? 1 : -1;
            const colStep = toCol > fromCol ? 1 : -1;

            let r = fromRow + rowStep;// premiere case à vérifier sur le chemin
            let c = fromCol + colStep;// premiere case à vérifier sur le chemin

            while (r !== toRow && c !== toCol) {
                // Meme si "||" devrait aussi fonctionner vu que r et c avancent au meme ryhtme et s'arretent au meme moment
                if (board[r][c]) {
                    return false;// Une pièce bloque le chemin
                }
                r += rowStep;
                c += colStep;
            }

            return true;// Sinon c'est valide
        }

        // Déplacement d'une tour
        if (piece.endsWith('R')) {
            // console.log(castlingRights);
            const rowDiff = Math.abs(fromRow - toRow);
            const colDiff = Math.abs(fromCol - toCol);
            // On vérifie le mouvement en ligne ou en colonne
            if(rowDiff !== 0 && colDiff !== 0) {
                return false;
            }
            // On vérifie que le chemin est libre
            const rowStep = rowDiff === 0 ? 0 : (toRow > fromRow ? 1 : -1);
            const colStep = colDiff === 0 ? 0 : (toCol > fromCol ? 1 : -1);

            let r = fromRow + rowStep;// premiere case à vérifier sur le chemin
            let c = fromCol + colStep;// premiere case à vérifier sur le chemin

            while (r !== toRow || c !== toCol) {
                // Meme si "||" devrait aussi fonctionner vu que r et c avancent au meme ryhtme et s'arretent au meme moment
                if (board[r][c]) {
                    return false;// Une pièce bloque le chemin
                }
                r += rowStep;
                c += colStep;
            }

            return true;// Sinon c'est valide
        }

        // Déplacement de la reine
        if (piece.endsWith('Q')) {
            const rowDiff = Math.abs(fromRow - toRow);
            const colDiff = Math.abs(fromCol - toCol);
            // On vérifie le mouvement en ligne ou en colonne ou en diagonale
            if(rowDiff !== 0 && colDiff !== 0 && rowDiff !== colDiff) {
                return false;
            }
            // On vérifie que le chemin est libre
            const rowStep = rowDiff === 0 ? 0 : (toRow > fromRow ? 1 : -1);
            const colStep = colDiff === 0 ? 0 : (toCol > fromCol ? 1 : -1);

            let r = fromRow + rowStep;// premiere case à vérifier sur le chemin
            let c = fromCol + colStep;// premiere case à vérifier sur le chemin

            while (r !== toRow || c !== toCol) {
                // Meme si "||" devrait aussi fonctionner vu que r et c avancent au meme ryhtme et s'arretent au meme moment
                if (board[r][c]) {
                    return false;// Une pièce bloque le chemin
                }
                r += rowStep;
                c += colStep;
            }

            return true;// Sinon c'est valide
        }

        // Déplacement du roi (en tenant compte du roque)
        if (piece.endsWith('K')) {
            // console.log(castlingRights);
            const rowDiff = Math.abs(fromRow - toRow);
            const colDiff = Math.abs(fromCol - toCol);

            // On vérifie qu'on se déplace d'une seule case
            if (rowDiff <= 1 && colDiff <= 1) {
                return true;
            }

            // Tentative de roque : on vérifie la mécanique mais pas les lignes d'échecs
            // donc le roi souhaite se deplacer de deux cases sur la meme rangée et aucune pièce entre le roi et la tour
            if (rowDiff === 0 && colDiff === 2) {
                const isWhite = piece === 'wK';
                const rights = castlingRights[isWhite ? "white" : "black"];
                console.log(castlingRights);

                // On ne roque pas si le roi est en echec
                if (isInCheck(board, turn)) {
                    return false;
                }
                // On ne roque pas si le roi traverse une case d'echec (il n'y a qu'une seule case intermediaire)

                const simulatedBoard = board.map(r => [...r]);
                const temp = (toCol > fromCol) ? 1 : -1;
                simulatedBoard[fromRow][fromCol + temp] = piece;
                simulatedBoard[fromRow][fromCol] = null;
                // console.log(simulatedBoard);
                // console.log(fromRow, fromCol + temp);
                if (isInCheck(simulatedBoard, turn)) {
                    return false;
                }

                // On ne roque pas si le roi atterit sur une case d'echec
                // Mais dejà géré par la verif de fin de movePiece

                // Petit roque : kingSide 
                if (toCol > fromCol && rights.kingSide) {
                    // On vérifie les cases vides entre le roi et la tour col 6 et 7
                    if (!board[fromRow][5] && !board[fromRow][6]) {
                        return true;
                    }
                }

                // Grand roque : queenSide 
                if (toCol < fromCol && rights.queenSide) {
                    // On vérifie les cases vides entre le roi et la tour col 2, 3 et 4
                    if (!board[fromRow][1] && !board[fromRow][2] && !board[fromRow][3]) {
                        return true;
                    }
                }
            }

            return false;
        }

        return true;// on valide pour les autres pieces pour le moment
    }

    const isInCheck = (board, turn) => {
        // console.log(board);
        const isWhiteTurn = turn === "white";
        // Retrouver la position du roi
        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) { continue; }
                if (isWhiteTurn && piece === 'wK') { kingPos = { row: r, col: c }; }
                if (!isWhiteTurn && piece === 'bK') { kingPos = { row: r, col: c }; }
            }
        }

        // Si on ne retrouve pas le roi sur le terrain, lors bug
        if (!kingPos) { return false; } // Sécurité

        // Vérifier pour toutes les pices adverses si un coup légal de leur part peut capturer notre roi
        // (ou tout simplement on peut dire la trajectoire d'un kamahameha de leur part)
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) { continue; }
                const isWhitePiece = piece.startsWith('w');
                if (isWhitePiece === isWhiteTurn) { continue; }// ce n'est pas une pièce adverse

                if (isMoveValid(piece, { row: r, col: c }, kingPos, board)) {
                    // console.log(piece, { row: r, col: c }, kingPos);
                    console.log(piece, { row: r, col: c }, kingPos);
                    return true;
                }
            }
        }

        return false;// Si rien de tout ça, alors le roi n'est pas en echec
    }

    const isInCheckMate = (board, turn) => {
        // S'il n'y a pas d'echec pas d'intéret de vérifier l'échec et mat
        if (!isInCheck(board, turn)) { return false };

        // On parcourt toutes les pièces du joueur
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) { continue; }
                const isWhitePiece = piece.startsWith('w');
                // On verifie que le tour et la piece du joueur correspondent car on cherche une piece
                // (ou un mouvement de piece) pouvant empecher l'echec, donc une piece de ce joueur
                if ((turn === "white" && !isWhitePiece) || (turn === "black" && isWhitePiece)) { continue; }

                // Tester tous les deplacements possibles et verifier si une configuration empeche l'echec
                for (let tr = 0; tr < 8; tr++) {// testRow et testCol
                    for (let tc = 0; tc < 8; tc++) {
                        const to = { row: tr, col: tc };// testOption
                        if (!isMoveValid(piece, { row: r, col: c }, to, board)) { continue; };
                        // On vérifie si déplacer la piece de r-c à tr-tc peut empecher l'echec
                        
                        const newNewBoard = board.map(r => [...r]);
                        newNewBoard[tr][tc] = piece;
                        newNewBoard[r][c] = null;

                        if (!isInCheck(newNewBoard, turn)) {
                            console.log(piece, base[r][c], base[tr][tc]);
                            return false;// On a au moins un coup qui permet de sortir de l'échec
                        }
                    }
                }
            }
        }

        return true;// Aucun coup ne permet de sauver alors échec et mat
    }

    useEffect(() => {
        setData(history);
    }, [history]);

    useEffect(() => {
        toggleTurn(turn);
    }, [turn]);

    useEffect(() => {
        setTotalMaterial(material);
    }, [material]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                undoLastMove();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [undoLastMove]);

    return (
    <>
    <div className="main-chessboard">
        {board.map((row, rowIndex) => 
            row.map((cell, colIndex) => {
                const isSelected = selected && selected.row === rowIndex && selected.col === colIndex;
                const isOldPlace = oldPlace && oldPlace.row === rowIndex && oldPlace.col === colIndex;
                const isNewPlace = newPlace && newPlace.row === rowIndex && newPlace.col === colIndex;
                // const squarePiece = board[rowIndex][colIndex];
                const squareName = base[rowIndex][colIndex];
                const highlightedSet = new Set(highlightedSquares.map(sq => `${sq.row}-${sq.col}`));
                const isHighlighted = highlightedSet.has(`${rowIndex}-${colIndex}`);
                return (
                    <div
                        className={
                            "cell" + squareName + " " + 
                            giveColor(rowIndex, colIndex) + 
                            (isSelected ? " selected" : "") +
                            (isOldPlace ? " old-place" : "") +
                            (isNewPlace ? " new-place" : "")
                        }
                        key={squareName}
                        onClick={() => handleClick(rowIndex, colIndex)}
                    >
                        {cell && (
                            <img 
                                src={piecesImages[cell][0]} 
                                alt={cell} 
                                className={
                                    cell + (
                                        (check && ((cell === 'bK' && turn === 'black') || (cell === 'wK' && turn === 'white'))) ?
                                         " alert-check": ""
                                    ) + (
                                        (cell.startsWith('b')) ? " black-piece" : ""
                                    )
                                }
                            />
                        )}
                        <span className="square-name">{squareName}</span>
                        {isHighlighted && (
                            <span className={"isHighlighted" + (cell ? " can-capture": "")}></span>
                        )}
                    </div>
                )
            })
        )}
        <button 
            type="button" 
            onClick={undoLastMove} 
            className={"undo-move" + (turn === "white" ? " udm-down" : " udm-up")}
        >
            Annuler
        </button>
    </div>
    {showPromotionPopUp && (
    <div className="promotion-pop-up">
        <div className="promotion-content">
            <h2>Make your promotion choice</h2>
            <div className="promotion-options">
            {(promotionColor === "white") && ['wQ', 'wN', 'wR', 'wB'].map((item, index) => (
                    <span 
                    key={index}
                    onClick={() => promotionResolver(item[1])}
                    ><img src={piecesImages[item][0]} alt={item} /></span>
                ))
            }
            {(promotionColor === "black") && ['bQ', 'bN', 'bR', 'bB'].map((item, index) => (
                    <span key={index}
                    onClick={() => promotionResolver(item[1])}
                    ><img src={piecesImages[item][0]} alt={item} /></span>
                ))
            }
            </div>
        </div>
    </div>
    )}
    {showMate && (
        <div className="mate-big-box">
            <div className="mate-content-box">
                {/* {<span>CONGRATULATIONS !!!</span>} */}
                <span>{(turn === "white") ? "BLACK" : "WHITE"} has won by CHECKMATE !!!</span>
            </div>
        </div>
    )}
    </>
    )
}

export default Chessboard;