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
            cube : new Cube(),
            torus : new defs.Torus(10,10),
        }

        this.hoop_location = Mat4.identity().times(Mat4.translation(0,5.6,-11.7).times(Mat4.scale(1,0.4,1).times(Mat4.rotation(3.14/2,1,0,0))));
        this.materials = {
            phong: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
            }),
            texture: new Material(new Textured_Phong(), {
                ambient: 0.8, diffusivity: 0, specularity: 0.1,
                texture: new Texture("assets/b_texture.png"),
            }),
            court_texture: new Material(new Textured_Phong(), {
                ambient: 0.8, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/court.png")
            }),
            backboard_texture: new Material(new Textured_Phong(), {
                ambient: 0.8, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/Backboard.png")
            }),
            rim_texture: new Material(new Textured_Phong(), {
                color: hex_color("#C0C0C0"),
            }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }
    //this function returns basketball's motion along its projectile path
    //TODO: make this function more general such as when it is not directly facing the net and wind
    basketball_thrown(ball_transform,initial_velocity,angle,time_thrown){
      //time_thrown represents the exact instant in time when our player decides to shoot ball
      //for now time_thrown will be at time 3
      let ballTime = this.t - time_thrown;
      //for now our initial_velocity will be 25 m/s
      
      //assume our mass of ball is 0.624 kg
      const gravity = 9.81 //force of gravity on ball
      //x direction not affected by gravity
      const horizontalPosition = initial_velocity*Math.cos(angle) * ballTime;
      const verticalPosition = initial_velocity*Math.sin(angle)*ballTime - (0.5*gravity*(ballTime**2));
      //with how we are currently set up, we are facing the net in the -z direction.
      ball_transform = ball_transform.times(Mat4.translation(0,verticalPosition,-1*horizontalPosition));
      return ball_transform;
    }
    create_court(context,program_state,model_transform){
        //create the court ground
        //current model_transform is uniform and cube we are using is a unit cube
        //1 unit counts as 1 meter (Subject to change)
        model_transform = model_transform.times(Mat4.translation(0,-3,0).times(Mat4.scale(5,3,5)));
        let court_transform = model_transform.times(Mat4.scale(7.62,0.1,14.325));
        this.shapes.cube.draw(context,program_state,court_transform,this.materials.court_texture);
        //create the pole holding up the hoop
        let pole_transform = model_transform.times(Mat4.translation(0,0,-13.1058))
            .times(Mat4.scale(0.40,3.5,0.4))
            .times(Mat4.translation(0,1,0));
        this.shapes.cube.draw(context,program_state,pole_transform,this.materials.phong)
        let back_board_transform = model_transform.times(Mat4.translation(0,7,-12.6).times(Mat4.scale(2,2,0.1)))
        this.shapes.cube.draw(context,program_state,back_board_transform,this.materials.backboard_texture)
        let rim_transform = model_transform.times(Mat4.translation(0,5.6,-11.7).times(Mat4.scale(1,0.4,1).times(Mat4.rotation(3.14/2,1,0,0))))
        this.shapes.torus.draw(context,program_state,rim_transform,this.materials.rim_texture)
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

        this.t = program_state.animation_time / 1000;
        let dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();
        
        //for now we assume ball was thrown at 45 degrees from the vertical
        let angle = 0.78539; //radians
        //also for now assume intial velocity is 25m/s and time thrown is at 0
        let ball_transform = model_transform;
        if(this.t > 3.0){ //ball thrown at 3 seconds
          ball_transform = this.basketball_thrown(model_transform,25,angle,3);
        }
        this.shapes.basketball.draw(context, program_state, ball_transform, this.materials.texture);
        this.create_court(context,program_state,model_transform);
        
    }
}



