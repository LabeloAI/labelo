import { MediaPlayer } from "../Common/MediaPlayer/MediaPlayer";
import TablePlayer from "../Common/MediaPlayer/TablePlayer";

export const AudioCell = (column) => {
  return <TablePlayer src={column.value} />;
};

AudioCell.style = {
  width: 100,
  minWidth: 100,
};

/* Audio Plus */

export const AudioPlusCell = (column) => {
  return <TablePlayer src={column.value} />;
};

AudioPlusCell.style = {
  width: 240,
  minWidth: 240,
};

AudioPlusCell.userSelectable = false;
