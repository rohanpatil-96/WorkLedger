use tauri::generate_context, generate_handler;

fn main() {
    tauri::Builder::default()
        .invoke_handler(generate_handler![])
        .run(generate_context!())
        .expect("error while running tauri application");
}
