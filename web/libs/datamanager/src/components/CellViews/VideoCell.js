import { MediaPlayer } from "../Common/MediaPlayer/MediaPlayer";
import TablePlayer from "../Common/MediaPlayer/TablePlayer";

export const VideoCell = (column) => {
  return <TablePlayer src={column.value} video />;
};

VideoCell.style = {
  width: 100,
  minWidth: 100,
};

