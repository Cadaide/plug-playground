declare namespace cadaide {
  type EventId = "initialize";

  function notify(message: string): void;
  function on(event: EventId, callback: () => void): void;
}
