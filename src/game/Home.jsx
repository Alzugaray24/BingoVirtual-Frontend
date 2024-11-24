import { useEffect, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  setGames,
  addGame,
  deleteGame,
  setCurrentGame,
} from "../store/slices/gameSlice";
import {
  setSuccessMessage,
  clearSuccessMessage,
} from "../store/slices/successMessageSlice";
import { setError, clearError } from "../store/slices/requestStatusSlice";
import { openModal, closeModal } from "../store/slices/modalSlice";

import { CircularProgress, Box } from "@mui/material";

import useSocket from "../hooks/useSocket";

import GameList from "../components/game/GameList";
import CurrentGame from "../components/game/CurrentGame";
import SuccessMessage from "../components/game/SuccessMessage";
import ErrorMessage from "../components/game/ErrorMessage";
import CustomButton from "../components/game/CustomButton";
import GameTitle from "../components/game/GameTitle";
import CustomModal from "../components/game/CustomModal";

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { games, currentGame } = useSelector((state) => state.game);
  const { loading, error } = useSelector((state) => state.requestStatus);
  const { successMessage, messageType } = useSelector(
    (state) => state.successMessage
  );
  const userId = useSelector((state) => state.auth.userId);
  const { isOpen, content, type } = useSelector((state) => state.modal);

  console.log("home currentGame", currentGame);

  // State local para las funciones del modal
  const [onConfirmAction, setOnConfirmAction] = useState(null);

  const showMessage = (message, type) => {
    dispatch(setSuccessMessage({ message, messageType: type }));
  };

  const {
    viewGames,
    createGame,
    deleteGame: deleteGameSocket,
    joinGame,
    removePlayer,
  } = useSocket({
    onGamesList: (data) => dispatch(setGames(data)),
    onGameCreated: (game) => {
      dispatch(addGame(game));
      showMessage("Un nuevo juego ha sido creado.", "success");
    },
    onGameDeleted: (gameId) => {
      dispatch(deleteGame(gameId));
      showMessage("El juego fue eliminado exitosamente.", "info");
    },
    onGameJoined: (game) => {
      console.log("game joined", game);

      dispatch(setCurrentGame(game));
      navigate(`/game-detail/${game._id}`);
    },
    onPlayerDisconnected: (userId) => {
      showMessage(`El jugador con ID ${userId} se desconectó.`, "warning");
    },
    onPlayerRemoved: (player) => {
      showMessage(`El jugador con ID ${player.userId} fue removido.`, "info");
    },
    onError: (err) => {
      dispatch(setError(err.message || "Ocurrió un error inesperado."));
      setTimeout(() => dispatch(clearError()), 3000);
    },
  });

  useEffect(() => {
    viewGames();
  }, [viewGames]);

  const handleCreateGame = useCallback(() => createGame(), [createGame]);

  const handleDeleteGame = useCallback(
    (gameId) => {
      setOnConfirmAction(() => () => {
        deleteGameSocket(gameId);
        dispatch(closeModal());
      });

      dispatch(
        openModal({
          type: "confirm",
          content: {
            message: "¿Estás seguro de que deseas eliminar este juego?",
          },
        })
      );
    },
    [dispatch, deleteGameSocket]
  );

  const handleJoinGame = useCallback(
    (gameId) => {
      if (!userId) {
        dispatch(
          setError(
            "El ID del usuario no está definido. No se puede unir al juego."
          )
        );
        return;
      }
      joinGame(gameId, userId);
    },
    [dispatch, joinGame, userId]
  );

  const handleRemovePlayer = useCallback(
    (gameId, userId) => removePlayer(gameId, userId),
    [removePlayer]
  );

  useEffect(() => {
    if (successMessage) {
      const timeout = setTimeout(() => {
        dispatch(clearSuccessMessage());
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [successMessage, dispatch]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <GameTitle title="Bingo Virtual - Inicio" />

      <Box sx={{ width: "100%", maxWidth: "600px", margin: "16px 0" }}>
        <SuccessMessage message={successMessage} messageType={messageType} />
        <ErrorMessage error={error} />
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box mb={4}>
            <CustomButton
              text="Crear Juego"
              color="primary"
              onClick={handleCreateGame}
              size="large"
              borderRadius="8px"
              sx={{
                backgroundColor: "#007bff",
                "&:hover": { backgroundColor: "#0056b3" },
              }}
            />
          </Box>

          <GameList
            games={games}
            userId={userId}
            onJoinGame={handleJoinGame}
            onDeleteGame={handleDeleteGame}
            onRemovePlayer={handleRemovePlayer}
          />

          {currentGame && (
            <>
              <CurrentGame
                currentGame={currentGame}
                onLeaveGame={() => dispatch(setCurrentGame(null))}
              />
            </>
          )}
        </>
      )}

      <CustomModal
        isOpen={isOpen}
        type={type}
        message={content?.message}
        onConfirm={onConfirmAction}
        onCancel={() => dispatch(closeModal())}
      />
    </Box>
  );
};

export default Home;
