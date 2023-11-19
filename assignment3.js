import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export class basketBallScene extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.shapes = {
            basketball: new defs.Subdivision_Sphere(5),
            cube : new Cube()
        }


        this.materials = {
            phong: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
            }),
            texture: new Material(new Textured_Phong(), {
                ambient: 0.5, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/b_texture.png")
            }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    create_court(context,program_state,model_transform){
        //create the court ground
        //current model_transform is uniform and cube we are using is a unit cube
        //1 unit counts as 1 meter (Subject to change)
        model_transform = model_transform.times(Mat4.translation(0,-3,0));
        let court_transform = model_transform.times(Mat4.scale(7.62,0.1,14.325));
        this.shapes.cube.draw(context,program_state,court_transform,this.materials.phong);
        //create the pole holding up the hoop
        let pole_transform = model_transform.times(Mat4.translation(0,0,-13.1058))
            .times(Mat4.scale(0.40,3.5,0.4))
            .times(Mat4.translation(0,1,0));
        this.shapes.cube.draw(context,program_state,pole_transform,this.materials.phong)
    }
    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
    }

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, 0, -8));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        const light_position = vec4(10, 10, 10, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        // TODO:  Draw the required boxes. Also update their stored matrices.
        // You can remove the folloeing line.
        this.shapes.basketball.draw(context, program_state, model_transform, this.materials.texture);
        this.create_court(context,program_state,model_transform);

    }
}



