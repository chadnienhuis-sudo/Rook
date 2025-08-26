import React, { useEffect, useMemo, useState } from 'react';

const TOTAL_HAND_POINTS = 180;

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw =
        typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

export function teamOf(playerIndex) {
  return playerIndex === 0 || playerIndex === 2 ? '1' : '2';
}

export function roundToNearest5(n, min = 0, max = TOTAL_HAND_POINTS) {
  const v = Math.round((Number(n) || 0) / 5) * 5;
  return Math.min(max, Math.max(min, v));
}

export function computeTotals(rounds) {
  let t1 = 0,
    t2 = 0;
  const history = [];
  for (const r of rounds) {
    const bid = Number(r?.bid ?? 0);
    const bidder = Number(r?.bidder ?? 0);
    const teamAPoints = Number(r?.teamAPoints ?? 0);
    const teamBPoints = Number(r?.teamBPoints ?? 0);
    const bidderTeam = teamOf(bidder);
    const bidderTeamPoints = bidderTeam === '1' ? teamAPoints : teamBPoints;
    const madeBid = bidderTeamPoints >= bid;
    if (madeBid) {
      t1 += teamAPoints;
      t2 += teamBPoints;
    } else {
      if (bidderTeam === '1') {
        t1 -= bid;
        t2 += teamBPoints;
      } else {
        t2 -= bid;
        t1 += teamAPoints;
      }
    }
    history.push({ round: history.length + 1, team1: t1, team2: t2 });
  }
  return { team1: t1, team2: t2, history };
}

export function inferRoundFromNonBid({ bid, bidder, dealer, nonBidPts }) {
  const bTeam = teamOf(bidder ?? 0);
  const nonBidTeam = bTeam === '1' ? '2' : '1';
  const nb = roundToNearest5(
    Math.max(0, Math.min(TOTAL_HAND_POINTS, Number(nonBidPts) || 0))
  );
  const teamAPoints = nonBidTeam === '1' ? nb : TOTAL_HAND_POINTS - nb;
  const teamBPoints = nonBidTeam === '2' ? nb : TOTAL_HAND_POINTS - nb;
  return {
    bid: roundToNearest5(bid),
    bidder: bidder ?? 0,
    dealer: dealer ?? 0,
    teamAPoints,
    teamBPoints,
  };
}

function Header({ players, nextDealerIndex }) {
  const idx = Number.isInteger(nextDealerIndex) ? nextDealerIndex : 0;
  return (
    <div className="p-4 pb-2">
      <h1 className="text-2xl font-bold tracking-tight">Rook Scorekeeper</h1>
      <p className="text-sm text-gray-600">Mobile-friendly tracker</p>
      <div className="mt-1 text-sm">
        Next Dealer:{' '}
        <span className="font-medium">
          {players[idx] || `Player ${idx + 1}`}
        </span>
      </div>
    </div>
  );
}

function PlayerSetup({
  players,
  setPlayers,
  teamNames,
  setTeamNames,
  startingDealer,
  setStartingDealer,
  roundsCount,
  dealerLocked,
  setDealerLocked,
  nextDealerManual,
  nextDealerIndex,
  setNextDealerManual,
  setNextDealerIndex,
  hidden,
  onToggle,
}) {
  const comp1 = `${players[0] || 'Player 1'}/${players[2] || 'Player 3'}`;
  const comp2 = `${players[1] || 'Player 2'}/${players[3] || 'Player 4'}`;
  const disableDealerSelect = dealerLocked;
  if (hidden) {
    return (
      <div className="p-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <div>
            Team 1:{' '}
            <span className="font-medium">{teamNames[0] || 'Team 1'}</span> (
            {comp1})
          </div>
          <div>
            Team 2:{' '}
            <span className="font-medium">{teamNames[1] || 'Team 2'}</span> (
            {comp2})
          </div>
        </div>
        <button className="rounded-xl border px-3 py-2" onClick={onToggle}>
          Edit Setup
        </button>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Setup</div>
        <button className="text-sm underline" onClick={onToggle}>
          Hide
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {players.map((p, i) => (
          <div key={i} className="flex flex-col">
            <label className="text-xs text-gray-500">Player {i + 1}</label>
            <input
              className="rounded-xl border px-3 py-2 text-base"
              placeholder={`Player ${i + 1}`}
              value={players[i]}
              onChange={(e) => {
                const next = [...players];
                next[i] = e.target.value;
                setPlayers(next);
              }}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Team 1 Name</label>
          <input
            className="rounded-xl border px-3 py-2 text-base"
            placeholder="Team 1"
            value={teamNames[0]}
            onChange={(e) => setTeamNames([e.target.value, teamNames[1]])}
          />
          <div className="text-xs text-gray-500 mt-1">Composition: {comp1}</div>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Team 2 Name</label>
          <input
            className="rounded-xl border px-3 py-2 text-base"
            placeholder="Team 2"
            value={teamNames[1]}
            onChange={(e) => setTeamNames([teamNames[0], e.target.value])}
          />
          <div className="text-xs text-gray-500 mt-1">Composition: {comp2}</div>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Starting Dealer</label>
          {(dealerLocked || roundsCount > 0) && (
            <button
              type="button"
              className="text-[11px] underline"
              onClick={() => {
                setDealerLocked(false);
                setNextDealerManual(true);
              }}
            >
              Override
            </button>
          )}
        </div>
        <select
          className="mt-1 rounded-xl border px-3 py-2 disabled:opacity-50"
          value={
            roundsCount === 0
              ? startingDealer
              : dealerLocked
              ? startingDealer
              : nextDealerIndex
          }
          onChange={(e) => {
            const n = parseInt(e.target.value);
            if (roundsCount === 0) {
              setStartingDealer(n);
              if (!dealerLocked) setDealerLocked(true);
            } else {
              setNextDealerManual(true);
              setNextDealerIndex(n);
              setDealerLocked(true);
            }
          }}
          disabled={disableDealerSelect}
        >
          {players.map((p, i) => (
            <option key={i} value={i}>
              {p || `Player ${i + 1}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ScoreBoard({ teamNames, totals }) {
  return (
    <div className="p-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border p-4">
          <div className="text-xs text-gray-500">
            {teamNames[0] || 'Team 1'}
          </div>
          <div className="text-3xl font-bold mt-1">{totals.team1}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-4">
          <div className="text-xs text-gray-500">
            {teamNames[1] || 'Team 2'}
          </div>
          <div className="text-3xl font-bold mt-1">{totals.team2}</div>
        </div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-[26rem] bg-white rounded-t-2xl sm:rounded-2xl p-4 shadow-lg">
        {children}
      </div>
    </div>
  );
}

function ConfirmResetModal({ open, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onCancel}>
      <div className="space-y-3">
        <div className="text-lg font-semibold">Start a new game?</div>
        <div className="text-sm text-gray-600">
          This will clear rounds and reset the setup.
        </div>
        <div className="flex gap-2 pt-1">
          <button
            className="flex-1 rounded-xl border px-4 py-2"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-xl bg-black text-white px-4 py-2"
            onClick={onConfirm}
          >
            Yes, New Game
          </button>
        </div>
      </div>
    </Modal>
  );
}

function NumberPicker5({
  label,
  value,
  setValue,
  min = 0,
  max = TOTAL_HAND_POINTS,
}) {
  const [text, setText] = useState(String(value ?? 0));
  useEffect(() => {
    const num = Number(text);
    if (!Number.isFinite(num) || num !== value) setText(String(value ?? 0));
  }, [value]);
  const commit = () => {
    const raw = Number(text);
    const next = roundToNearest5(
      Number.isFinite(raw) ? raw : value ?? 0,
      min,
      max
    );
    setValue(next);
    setText(String(next));
  };
  const stepBy = (delta) => {
    const raw = Number(text);
    const base = Number.isFinite(raw) ? raw : value ?? 0;
    const next = roundToNearest5(base + delta, min, max);
    setValue(next);
    setText(String(next));
  };
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <div className="flex gap-2 items-center">
        <button
          type="button"
          className="rounded-lg border px-3 py-2"
          onClick={() => stepBy(-5)}
        >
          -5
        </button>
        <input
          type="number"
          inputMode="numeric"
          step={1}
          min={min}
          max={max}
          className="w-full rounded-xl border px-3 py-2"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
        />
        <button
          type="button"
          className="rounded-lg border px-3 py-2"
          onClick={() => stepBy(5)}
        >
          +5
        </button>
      </div>
      <div className="text-[11px] text-gray-500 mt-1">
        Type any number; it rounds to the nearest 5 on blur.
      </div>
    </div>
  );
}

function StartHandModal({ open, onClose, players, pending, onSubmit }) {
  const [bid, setBid] = useState(120);
  const [bidder, setBidder] = useState(0);
  useEffect(() => {
    if (open) {
      if (pending) {
        setBid(pending.bid);
        setBidder(pending.bidder);
      }
    }
  }, [open, pending]);
  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-lg font-semibold">Start Hand</div>
        <NumberPicker5
          label="Bid (increments of 5)"
          value={bid}
          setValue={setBid}
          min={0}
          max={TOTAL_HAND_POINTS}
        />
        <div>
          <label className="text-xs text-gray-500">Took Bid</label>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={bidder}
            onChange={(e) => setBidder(parseInt(e.target.value))}
          >
            {players.map((p, i) => (
              <option key={i} value={i}>
                {p || `Player ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            className="flex-1 rounded-xl border px-4 py-2"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-xl bg-black text-white px-4 py-2"
            onClick={() => {
              onSubmit({ bid: roundToNearest5(bid), bidder });
            }}
          >
            Submit Bid
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EndHandModal({
  open,
  onClose,
  players,
  pending,
  onSubmit,
  teamNames,
}) {
  const [nonBidPts, setNonBidPts] = useState(0);
  useEffect(() => {
    if (open) setNonBidPts(0);
  }, [open]);
  if (!pending) return null;
  const bidderTeam = teamOf(pending.bidder);
  const nonBidTeam = bidderTeam === '1' ? '2' : '1';
  const teamNameByLabel = (label) =>
    label === '1' ? teamNames[0] || 'Team 1' : teamNames[1] || 'Team 2';
  const valid = nonBidPts >= 0 && nonBidPts <= TOTAL_HAND_POINTS;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-lg font-semibold">Enter Scores</div>
        <div className="text-sm text-gray-600">
          Bid: <span className="font-medium">{pending.bid}</span> — Took Bid:{' '}
          <span className="font-medium">
            {players[pending.bidder] || `Player ${pending.bidder + 1}`}
          </span>{' '}
          (Team {bidderTeam})
        </div>
        <NumberPicker5
          label={`Non-bidding Team (${teamNameByLabel(nonBidTeam)}) Points`}
          value={nonBidPts}
          setValue={setNonBidPts}
          min={0}
          max={TOTAL_HAND_POINTS}
        />
        <div className="flex gap-2 pt-1">
          <button
            className="flex-1 rounded-xl border px-4 py-2"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-xl bg-black text-white px-4 py-2 disabled:opacity-40"
            disabled={!valid}
            onClick={() => onSubmit({ nonBidPts: roundToNearest5(nonBidPts) })}
          >
            Add Round
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RoundsTable({ players, rounds, onUndo, teamNames, totals }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Rounds</div>
        <button
          onClick={onUndo}
          disabled={rounds.length === 0}
          className="text-sm px-3 py-1 rounded-lg border bg-white disabled:opacity-40"
        >
          Undo Last
        </button>
      </div>
      {rounds.length === 0 ? (
        <div className="text-sm text-gray-500">No rounds yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Dealer</th>
                <th className="py-2 pr-3">Bid</th>
                <th className="py-2 pr-3">Took Bid</th>
                <th className="py-2 pr-3">{teamNames[0] || 'Team 1'}</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">{teamNames[1] || 'Team 2'}</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r, idx) => {
                const bidderIdx = Number.isInteger(r?.bidder) ? r.bidder : -1;
                const dealerIdx = Number.isInteger(r?.dealer) ? r.dealer : -1;
                const bidderName =
                  bidderIdx >= 0
                    ? players[bidderIdx] || `Player ${bidderIdx + 1}`
                    : '—';
                const dealerName =
                  dealerIdx >= 0
                    ? players[dealerIdx] || `Player ${dealerIdx + 1}`
                    : '—';
                const bidderTeam = bidderIdx >= 0 ? teamOf(bidderIdx) : '?';
                const bidVal = Number(r?.bid ?? 0);
                const tA = Number(r?.teamAPoints ?? 0);
                const tB = Number(r?.teamBPoints ?? 0);
                const madeBid = (bidderTeam === '1' ? tA : tB) >= bidVal;
                const resultLabel =
                  bidderIdx < 0
                    ? '—'
                    : madeBid
                    ? `Made (${bidVal})`
                    : `Set (-${bidVal})`;
                const cumulative = totals.history[idx] || {
                  team1: 0,
                  team2: 0,
                };
                return (
                  <tr key={idx} className="border-t">
                    <td className="py-2 pr-3">{idx + 1}</td>
                    <td className="py-2 pr-3">{dealerName}</td>
                    <td className="py-2 pr-3">{bidVal}</td>
                    <td className="py-2 pr-3">
                      {bidderName}
                      {bidderTeam !== '?' ? ` (Team ${bidderTeam})` : ''}
                    </td>
                    <td className="py-2 pr-3">{tA}</td>
                    <td className="py-2 pr-3 font-bold bg-gray-50">
                      {cumulative.team1}
                    </td>
                    <td className="py-2 pr-3">{tB}</td>
                    <td className="py-2 pr-3 font-bold bg-gray-50">
                      {cumulative.team2}
                    </td>
                    <td className="py-2 pr-3">{resultLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Controls({ onRequestNewGame }) {
  return (
    <div className="p-4 pt-0 flex gap-2">
      <button
        onClick={onRequestNewGame}
        className="rounded-xl border px-4 py-2 bg-white"
      >
        New Game
      </button>
    </div>
  );
}

export default function App() {
  const [players, setPlayers] = useLocalStorage('rook_players', [
    '',
    '',
    '',
    '',
  ]);
  const [teamNames, setTeamNames] = useLocalStorage('rook_team_names', [
    'Team 1',
    'Team 2',
  ]);
  const [startingDealer, setStartingDealer] = useLocalStorage(
    'rook_starting_dealer',
    0
  );
  const [dealerLocked, setDealerLocked] = useLocalStorage(
    'rook_dealer_locked',
    false
  );
  const [rounds, setRounds] = useLocalStorage('rook_rounds', []);
  const [pendingHand, setPendingHand] = useLocalStorage(
    'rook_pending_hand',
    null
  );
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [nextDealerManual, setNextDealerManual] = useLocalStorage(
    'rook_next_dealer_manual',
    false
  );
  const [nextDealerIndex, setNextDealerIndex] = useLocalStorage(
    'rook_next_dealer_index',
    0
  );
  const totals = useMemo(() => computeTotals(rounds), [rounds]);
  const [showSetup, setShowSetup] = useLocalStorage('rook_show_setup', true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const effectiveNextDealer = useMemo(() => {
    if (nextDealerManual) return nextDealerIndex;
    if (rounds.length > 0) return (rounds[rounds.length - 1].dealer + 1) % 4;
    return startingDealer;
  }, [nextDealerManual, nextDealerIndex, rounds, startingDealer]);

  const handleStartSubmit = ({ bid, bidder }) => {
    if (!dealerLocked) setDealerLocked(true);
    setPendingHand({ bid, bidder });
    setShowSetup(false);
    setStartOpen(false);
    setEndOpen(true);
  };

  const handleEndSubmit = ({ nonBidPts }) => {
    if (!pendingHand) return;
    const dealerForRound = effectiveNextDealer;
    const newRound = inferRoundFromNonBid({
      ...pendingHand,
      dealer: dealerForRound,
      nonBidPts,
    });
    setRounds([...rounds, newRound]);
    setPendingHand(null);
    setEndOpen(false);
    if (nextDealerManual) setNextDealerIndex((dealerForRound + 1) % 4);
  };

  const handleUndo = () => {
    if (rounds.length === 0) return;
    setRounds(rounds.slice(0, -1));
  };

  const handleNewGame = () => {
    setRounds([]);
    setPendingHand(null);
    setDealerLocked(false);
    setNextDealerManual(false);
    setNextDealerIndex(0);
    setStartingDealer(0);
    setStartOpen(false);
    setEndOpen(false);
    setShowSetup(true);
    setConfirmOpen(false);
  };

  return (
    <div className="max-w-xl mx-auto text-base">
      <Header players={players} nextDealerIndex={effectiveNextDealer} />

      <PlayerSetup
        players={players}
        setPlayers={setPlayers}
        teamNames={teamNames}
        setTeamNames={setTeamNames}
        startingDealer={startingDealer}
        setStartingDealer={setStartingDealer}
        roundsCount={rounds.length}
        dealerLocked={dealerLocked}
        setDealerLocked={setDealerLocked}
        nextDealerManual={nextDealerManual}
        nextDealerIndex={effectiveNextDealer}
        setNextDealerManual={setNextDealerManual}
        setNextDealerIndex={setNextDealerIndex}
        hidden={!showSetup && (dealerLocked || rounds.length > 0)}
        onToggle={() => setShowSetup((v) => !v)}
      />

      <ScoreBoard teamNames={teamNames} totals={totals} />

      <div className="p-4 flex gap-2">
        <button
          className="flex-1 rounded-xl bg-black text-white px-4 py-3"
          onClick={() => setStartOpen(true)}
        >
          {pendingHand ? 'Edit Pending Bid' : 'Start Hand (Bid)'}
        </button>
        <button
          className="flex-1 rounded-xl border px-4 py-3 disabled:opacity-40"
          disabled={!pendingHand}
          onClick={() => setEndOpen(true)}
        >
          Enter Scores
        </button>
      </div>

      <RoundsTable
        players={players}
        rounds={rounds}
        teamNames={teamNames}
        totals={totals}
        onUndo={handleUndo}
      />

      <Controls onRequestNewGame={() => setConfirmOpen(true)} />

      <div className="p-4 pt-0 text-xs text-gray-500 space-y-1">
        <p>
          Variant notes: Rook card counts as 10.5 for trick-taking order but is
          worth 20 points. Deck excludes 2–4s; 5 is low, 1 is high. Point cards
          per hand total {TOTAL_HAND_POINTS}.
        </p>
        <p>
          Inputs: bids & non-bidding points round to the nearest 5 on blur.
          Teams are fixed as P1/P3 vs P2/P4; names are editable. Starting Dealer
          sets the rotation; Override sets only the NEXT dealer.
        </p>
      </div>

      <StartHandModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        players={players}
        pending={pendingHand}
        onSubmit={handleStartSubmit}
      />
      <EndHandModal
        open={endOpen}
        onClose={() => setEndOpen(false)}
        players={players}
        pending={pendingHand}
        teamNames={teamNames}
        onSubmit={handleEndSubmit}
      />
      <ConfirmResetModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleNewGame}
      />
    </div>
  );
}

if (
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof console !== 'undefined'
) {
  (function runDevTests() {
    try {
      const ensureRoundShape = (r) => {
        if (r == null || typeof r !== 'object') return false;
        return ['bid', 'bidder', 'dealer', 'teamAPoints', 'teamBPoints'].every(
          (k) => k in r && Number.isFinite(Number(r[k]))
        );
      };
      console.assert(
        teamOf(0) === '1' &&
          teamOf(2) === '1' &&
          teamOf(1) === '2' &&
          teamOf(3) === '2',
        'teamOf mapping failed'
      );
      console.assert(
        roundToNearest5(123) === 125 && roundToNearest5(122) === 120,
        'roundToNearest5 rounding failed'
      );
      const r1 = inferRoundFromNonBid({
        bid: 100,
        bidder: 0,
        dealer: 0,
        nonBidPts: 60,
      });
      console.assert(
        ensureRoundShape(r1) &&
          r1.teamAPoints === 120 &&
          r1.teamBPoints === 60 &&
          r1.bid === 100 &&
          r1.bidder === 0,
        'inferRound structure failed'
      );
      let t = computeTotals([r1]);
      console.assert(
        t.team1 === 120 &&
          t.team2 === 60 &&
          t.history.length === 1 &&
          t.history[0].team1 === 120,
        'totals (made bid) failed'
      );
      const r2 = inferRoundFromNonBid({
        bid: 120,
        bidder: 0,
        dealer: 1,
        nonBidPts: 80,
      });
      console.assert(ensureRoundShape(r2), 'r2 shape invalid');
      t = computeTotals([r2]);
      console.assert(
        t.team1 === -120 && t.team2 === 80,
        'totals (set bid) failed'
      );
      t = computeTotals([r1, r2]);
      console.assert(
        t.team1 === 0 &&
          t.team2 === 140 &&
          t.history.length === 2 &&
          t.history[1].team2 === 140,
        'totals accumulation failed'
      );
      const r3 = inferRoundFromNonBid({
        bid: 85,
        bidder: 1,
        dealer: 2,
        nonBidPts: 75,
      });
      console.assert(ensureRoundShape(r3), 'r3 shape invalid');
      t = computeTotals([r3]);
      console.assert(
        t.team1 === 75 && t.team2 === 105,
        'team2 made bid failed'
      );
      const r4 = inferRoundFromNonBid({
        bid: 110,
        bidder: 1,
        dealer: 3,
        nonBidPts: 95,
      });
      console.assert(ensureRoundShape(r4), 'r4 shape invalid');
      t = computeTotals([r4]);
      console.assert(
        t.team1 === 95 && t.team2 === -110,
        'team2 set bid failed'
      );
      let simRounds = [];
      let simManual = false;
      let simNextIdx = 0;
      let simStart = 1;
      const eff = (r) =>
        simManual
          ? simNextIdx
          : r.length > 0
          ? (r[r.length - 1].dealer + 1) % 4
          : simStart;
      let dealer = eff(simRounds);
      const rr1 = inferRoundFromNonBid({
        bid: 90,
        bidder: 0,
        dealer,
        nonBidPts: 80,
      });
      console.assert(ensureRoundShape(rr1), 'rr1 shape invalid');
      simRounds.push(rr1);
      simManual = true;
      simNextIdx = 3;
      dealer = eff(simRounds);
      const rr2 = inferRoundFromNonBid({
        bid: 95,
        bidder: 2,
        dealer,
        nonBidPts: 70,
      });
      console.assert(ensureRoundShape(rr2), 'rr2 shape invalid');
      simRounds.push(rr2);
      simNextIdx = (dealer + 1) % 4;
      dealer = eff(simRounds);
      const rr3 = inferRoundFromNonBid({
        bid: 85,
        bidder: 1,
        dealer,
        nonBidPts: 60,
      });
      console.assert(ensureRoundShape(rr3), 'rr3 shape invalid');
      simRounds.push(rr3);
      console.assert(
        simRounds[0].dealer === 1 &&
          simRounds[1].dealer === 3 &&
          simRounds[2].dealer === 0,
        'override NEXT-only dealer logic failed'
      );
      t = computeTotals([{}]);
      console.assert(
        Array.isArray(t.history) && t.history.length === 1,
        'computeTotals should handle partial rounds'
      );
      t = computeTotals([]);
      console.assert(
        t.team1 === 0 && t.team2 === 0 && t.history.length === 0,
        'computeTotals empty failed'
      );
    } catch (e) {}
  })();
}
