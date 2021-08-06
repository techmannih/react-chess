import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { useDispatch, useSelector } from 'react-redux';
import boardActionTypes from '../constants/boardActionTypes';
import modeActionTypes from '../constants/modeActionTypes';
import modeNames from '../constants/modeNames';
import { startBoard } from '../actions/boardActions';
import { wsConnect, wsMssgStartAnalysis, wsMssgPiece } from '../actions/serverActions';
import Grid from '@material-ui/core/Grid';
import History from './History';
import Timers from './Timers';
import MoveValidator from './MoveValidator.js';
import Notice from './Notice.js';
import Ascii from '../utils/Ascii';
import Pgn from '../utils/Pgn';
import Piece from '../utils/Piece';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

const Board = ({props}) => {
  const state = useSelector(state => state);
  const dispatch = useDispatch();
  const classes = useStyles();

  useEffect(() => {
    dispatch(wsConnect(state, props)).then((ws) => {
      wsMssgStartAnalysis(ws).then(() => {
        dispatch({ type: modeActionTypes.RESET });
        dispatch(startBoard({ back: state.board.history.length - 1 }));
      });
    });
  }, [dispatch]);

  const pickPiece = (payload) => {
    if (modeNames.ANALYSIS === state.mode.current) {
      if (state.board.turn === Piece.color(payload.piece)) {
        dispatch({
          type: boardActionTypes.PICK_PIECE,
          payload: payload
        });
        wsMssgPiece(state, payload.algebraic);
      }
    } else if (modeNames.PLAYFRIEND === state.mode.current) {
      if (state.mode.playfriend.color === state.board.turn) {
        if (state.board.turn === Piece.color(payload.piece)) {
          dispatch({
            type: boardActionTypes.PICK_PIECE,
            payload: payload
          });
          wsMssgPiece(state, payload.algebraic);
        }
      }
    }
  };

  const board = () => {
    let rows = [];
    let color;
    let k = 0;
    Ascii.flip(
      state.board.flip,
      state.board.history[state.board.history.length - 1 + state.history.back]
    ).forEach((rank, i) => {
      let row = [];
      rank.forEach((piece, j) => {
          let payload = { piece: piece };
          let isLegal = '';
          let isSelected = '';
          (i + k) % 2 !== 0
            ? color = Pgn.symbol.BLACK
            : color = Pgn.symbol.WHITE;
          state.board.flip === Pgn.symbol.WHITE
            ? payload = {...payload, i: i, j: j, algebraic: Ascii.fromIndexToAlgebraic(i, j)}
            : payload = {...payload, i: 7 - i, j: 7 - j, algebraic: Ascii.fromIndexToAlgebraic(7 - i, 7 - j)};
          // todo: use the optional chaining operator
          if (state.board.picked) {
            if (state.board.picked.algebraic === payload.algebraic) {
              isSelected = 'is-selected';
            }
            if (state.board.picked.legal_moves) {
              if (state.board.picked.legal_moves.includes(payload.algebraic)) {
                isLegal = 'is-legal';
              }
            }
          }
          row.push(<div
              key={k}
              className={['square', color, payload.algebraic, isLegal, isSelected].join(' ')}
              onClick={() => {
                if (state.history.back === 0) {
                  if (state.board.picked && state.board.turn !== Piece.color(payload.piece)) {
                    dispatch({
                      type: boardActionTypes.LEAVE_PIECE,
                      payload: payload
                    });
                  } else {
                    pickPiece(payload);
                  }
                }
              }}>
              <span tabIndex={k}>
                {Piece.unicode[piece].char}
              </span>
            </div>
          );
          k++;
      });
      rows.push(<div key={i} className="board-row">{row}</div>);
    });

    return rows;
  }

  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid item md={12} lg={5}>
          <div className={['board', state.history.back !== 0 ? 'past' : 'present'].join(' ')}>
            {board()}
          </div>
        </Grid>
        <Grid item md={12} lg={7}>
          <Notice />
          <Timers />
          <MoveValidator />
          <History />
        </Grid>
      </Grid>
    </div>
  );
}

export default Board;
