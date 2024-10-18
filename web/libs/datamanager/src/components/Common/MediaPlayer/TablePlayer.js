import React, { useState, useRef } from 'react';
import { Block, Elem } from '../../../utils/bem';
import { absoluteURL } from '../../../utils/helpers';
import './TablePlayer.scss';
import {
  PiMusicNotes,
  PiMusicNotesFill,
  PiPause,
  PiPlay,
  PiPlayFill,
} from 'react-icons/pi';

const TablePlayer = ({ src, video = false }) => {
  const [enable, setEnable] = useState(false);
  const [play, setPlay] = useState(false);
  const [error, setError] = useState(false);
  const mediaRef = useRef(null);

  const handlePlayPause = (e) => {
    e.stopPropagation();
    if (mediaRef.current.paused) {
      mediaRef.current.play();
      setPlay(true);
    } else {
      mediaRef.current.pause();
      setPlay(false);
    }
  };

  if (error) {
    return <Block name="player_load_container">Unable to play</Block>;
  }

  return enable ? (
    <Block name="player_container" onClick={(e) => e.stopPropagation()}>
      {video ? (
        <video
          ref={mediaRef}
          src={absoluteURL(src)}
          height={50}
          width={100}
          style={{
            objectFit: 'cover',
            borderRadius: 5,
            backgroundColor: '#ddd',
          }}
          onError={() => setError(true)}
          onEnded={() => setPlay(false)}
        />
      ) : (
        <>
          <audio
            ref={mediaRef}
            src={absoluteURL(src)}
            controls
            style={{ width: '100%', height: 50, display: 'none' }}
            onError={() => setError(true)}
            onEnded={() => setPlay(false)}
          />
          <Elem name="audio_player">
            {play ? <PiMusicNotes size={20} /> : <PiMusicNotesFill size={20} />}
          </Elem>
        </>
      )}
      <Elem name="button" type="button" onClick={handlePlayPause}>
        {play ? <PiPause size={20} /> : <PiPlay size={20} />}
      </Elem>
    </Block>
  ) : (
    <Block
      name="player_load_container"
      onClick={(e) => {
        e.stopPropagation();
        setEnable(true);
      }}
    >
      <PiPlayFill size={20} color="rgba(0, 91, 167, 0.8)" />
      Click to load
    </Block>
  );
};

export default TablePlayer;
