declare namespace cadaide {
  type EventId = "initialize";

  namespace notifications {
    function info(message: string): void;
    function warning(message: string): void;
    function error(message: string): void;
    function success(message: string): void;
  }
  function on(event: EventId, callback: () => void): void;
}
