import { create } from "zustand";

const useRoomStore = create((set, get) => ({
  // Added 'get' to access state inside actions
  roomInfo: {
    pin: null,
    room_id: null,
    join_token: null,
  },
  myClientId: `user-${Math.floor(Math.random() * 1000)}`,
  peers: [],
  isConnected: false,

  setRoomInfo: (info) => set({ roomInfo: info }),
  setConnected: (status) => set({ isConnected: status }),

  addPeer: (peerId) => {
    const { myClientId, peers } = get();
    if (peerId === myClientId) return;
    if (peers.includes(peerId)) return;

    console.log("!!! STORE UPDATING: Adding peer ->", peerId);
    set({ peers: [...peers, peerId] });
  },

  removePeer: (peerId) =>
    set((state) => ({
      peers: state.peers.filter((id) => id !== peerId),
    })),

  resetRoom: () =>
    set({
      roomInfo: { pin: null, room_id: null, join_token: null },
      peers: [],
      isConnected: false,
    }),
  syncPeers: (peerList) =>
    set((state) => ({
      peers: peerList.filter((id) => id !== state.myClientId),
    })),
}));

export default useRoomStore;
