import {defs, tiny} from './examples/common.js';
import {Shape_From_File} from './examples/obj-file-demo.js'


import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './examples/shadow-demo-shaders.js'

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs
const Square =
    class Square extends tiny.Vertex_Buffer {
        constructor() {
            super("position", "normal", "texture_coord");
            this.arrays.position = [
                vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0),
                vec3(1, 1, 0), vec3(1, 0, 0), vec3(0, 1, 0)
            ];
            this.arrays.normal = [
                vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
                vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
            ];
            this.arrays.texture_coord = [
                vec(0, 0), vec(1, 0), vec(0, 1),
                vec(1, 1), vec(1, 0), vec(0, 1)
            ]
        }
    }

export class basketBallScene extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();



        this.ball_transform = Mat4.identity();
        this.vertVelocity = 10.61; //temp variable for projectile motion will delete in actual implementation
        this.shapes = {
            //basketball: new defs.Subdivision_Sphere(5),
            teapot: new Shape_From_File("assets/teapot.obj"),
            cube : new Cube(),
            torus : new defs.Torus(10,10),
            sphere_enclosing: new defs.Subdivision_Sphere(4),
            sphere: new defs.Subdivision_Sphere(6),
            square_2d: new Square(),

            //stands: new defs.Subdivision_Sphere(5), // adjust parameters as needed
            //roof: new defs.Cube(),
            //scorer: new defs.Cube(),
        }
        this.newRound = true; //tells whether this is new shot for player
        this.hoop_location = Mat4.identity().times(Mat4.translation(0,5.6,-11.7).times(Mat4.scale(1,0.4,1).times(Mat4.rotation(3.14/2,1,0,0))));
        this.materials = {
            phong: new Material(new Textured_Phong(), {
                color: hex_color("#CD5C5C"),
            }),
            texture: new Material(new Textured_Phong(), {
                ambient: 0.8, diffusivity: 0, specularity: 0.1,
                texture: new Texture("assets/b_texture.png"),
            }),
            texture_shadow: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: color(.5, .5, .5, 1),
                ambient: .4, diffusivity: .5, specularity: .5,
                color_texture: new Texture("assets/b_texture.png"),
                light_depth_texture: null
            }),
            court_texture: new Material(new Textured_Phong(), {
                ambient: 0.8, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/court.png")
            }),
            court_texture_shadow: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: color(1, 1, 1, 1), ambient: 0.4, diffusivity: 0.5, specularity: 0.5, smoothness: 64,
                color_texture: new Texture("assets/court.png"),
                light_depth_texture: null
            }),
            backboard_texture: new Material(new Textured_Phong(), {
                ambient: 0.8, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/Backboard.png")
            }),
            rim_texture: new Material(new Textured_Phong(), {
                color: hex_color("#FF5F15"),
            }),
            wall_texture: new Material(new Textured_Phong(), {
                color: hex_color("#C0C0C0"),
                ambient: 0.8, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/wall.png")
            }),
            indoor_texture: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: .9, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/indoor.png")
            }),
            outdoor_texture: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: .9, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/outdoor.png")
            }),
            lake_texture: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: .9, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/lake.png")
            }),
            light_src: new Material(new Phong_Shader(), {
                color: color(1, 1, 1, 1), ambient: 1, diffusivity: 0, specularity: 0
            }),
            floor : new Material(new Shadow_Textured_Phong_Shader(1), {
                color: color(1, 1, 1, 1), ambient: 0.3, diffusivity: 0.6, specularity: 0.4, smoothness: 64,
                color_texture: null,
                light_depth_texture: null
            })


        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 0), vec3(0,5.6,-11.7), vec3(0, 10, 0));
        this.environments = 0;
        this.init_ok = false;
        this.direction_vector = vec3(0,0,0);
        this.ball_thrown = false;
        this.current_direction  = vec3(0,0,0); // The direction we are looking at
    }

    // The way we will calculate collision, is by seperating each individual objects and then checking if the ball
    // collides with that object, if it does then we have a collision, and by taking the normal of the surface and teh
    // angle of incidence(We expect the collision to be fully elastic) we will relfect the balls in another direction/
    static intersect_ground(p, margin = 0) {
        return p[1] < -1.0;
    }


    texture_buffer_init(gl) {
        // Depth Texture
        this.lightDepthTexture = gl.createTexture();
        // Bind it to TinyGraphics
        this.light_depth_texture = new Buffered_Texture(this.lightDepthTexture);
        this.materials.texture_shadow.light_depth_texture = this.light_depth_texture
        this.materials.court_texture_shadow.light_depth_texture = this.light_depth_texture
        this.materials.floor.light_depth_texture = this.light_depth_texture


        this.lightDepthTextureSize = LIGHT_DEPTH_TEX_SIZE;
        gl.bindTexture(gl.TEXTURE_2D, this.lightDepthTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,      // target
            0,                  // mip level
            gl.DEPTH_COMPONENT, // internal format
            this.lightDepthTextureSize,   // width
            this.lightDepthTextureSize,   // height
            0,                  // border
            gl.DEPTH_COMPONENT, // format
            gl.UNSIGNED_INT,    // type
            null);              // data
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Depth Texture Buffer
        this.lightDepthFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,       // target
            gl.DEPTH_ATTACHMENT,  // attachment point
            gl.TEXTURE_2D,        // texture target
            this.lightDepthTexture,         // texture
            0);                   // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // create a color texture of the same size as the depth texture
        // see article why this is needed_
        this.unusedTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.unusedTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.lightDepthTextureSize,
            this.lightDepthTextureSize,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // attach it to the framebuffer
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,        // target
            gl.COLOR_ATTACHMENT0,  // attachment point
            gl.TEXTURE_2D,         // texture target
            this.unusedTexture,         // texture
            0);                    // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }


    //mouse controls
    my_mouse_down(e, pos, context, program_state) {
      let pos_ndc_near = vec4(pos[0], pos[1], -1.0, 1.0);
      let pos_ndc_far  = vec4(pos[0], pos[1],  1.0, 1.0);
      let center_ndc_near = vec4(0.0, 0.0, -1.0, 1.0);
      let P = program_state.projection_transform;
      let V = program_state.camera_inverse;
      let pos_world_near = Mat4.inverse(P.times(V)).times(pos_ndc_near);
      let pos_world_far  = Mat4.inverse(P.times(V)).times(pos_ndc_far);
      let center_world_near  = Mat4.inverse(P.times(V)).times(center_ndc_near);
      pos_world_near.scale_by(1 / pos_world_near[3]);
      pos_world_far.scale_by(1 / pos_world_far[3]);
      center_world_near.scale_by(1 / center_world_near[3]);
      // console.log(pos_world_near);
      // console.log(pos_world_far);
      //
      // Do whatever you want
      let animation_bullet = {
          from: center_world_near,
          to: pos_world_far,
          start_time: program_state.animation_time,
          end_time: program_state.animation_time + 5000,
          more_info: "add gravity"
      }

      //this.animation_queue.push(animation_bullet)
  }

    //this function returns basketball's motion along its projectile path
    //TODO: make this function more general such as when it is not directly facing the net and wind
    basketball_thrown(){
      //assume our mass of ball is 0.624 kg
      const gravity = 9.81; //force of gravity on ball
      var point = this.ball_transform.times(vec4(0,0,0,1));
      var directional_vector = this.direction_vector;
        // Constants for air resistance
        const rho = 0.005; // Air density (kg/m^3) at sea level
        const Cd = 0.2; // Drag coefficient for a sphere
        const A = 2.4567; // Cross-sectional area of the ball

        if(basketBallScene.intersect_ground(point)){
          var negated_vec = directional_vector.times(-1);
          directional_vector =  (vec3(0,1,0).times(2 * (vec3(0,1,0).dot(negated_vec)))).minus(negated_vec);
          const position_vector = vec3(directional_vector[0] * this.dt, directional_vector[1] * this.dt - (9.81/2) * this.dt * this.dt , directional_vector[2] * this.dt );
            const velocityMagnitude = Math.sqrt(Math.pow(directional_vector[0], 2) + Math.pow(directional_vector[1], 2) + Math.pow(directional_vector[2], 2));
            const dragForceMagnitude = 0.5 * rho * velocityMagnitude * velocityMagnitude * Cd * A;
            const dragForceVector = this.direction_vector.normalized().times(-dragForceMagnitude);
            this.direction_vector = vec3(directional_vector[0], directional_vector[1]- (9.81) * this.dt, directional_vector[2]).plus(dragForceVector);
          this.ball_transform = this.ball_transform.times(Mat4.translation(position_vector[0], position_vector[1],position_vector[2]));
      }
      else{
          const position_vector = vec3(directional_vector[0] * this.dt, directional_vector[1] * this.dt - (9.81/2) * this.dt * this.dt , directional_vector[2] * this.dt );
            const velocityMagnitude = Math.sqrt(Math.pow(directional_vector[0], 2) + Math.pow(directional_vector[1], 2) + Math.pow(directional_vector[2], 2));
            const dragForceMagnitude = 0.5 * rho * velocityMagnitude * velocityMagnitude * Cd * A;
            const dragForceVector = this.direction_vector.normalized().times(-dragForceMagnitude);
            this.direction_vector = vec3(directional_vector[0], directional_vector[1]- (9.81) * this.dt, directional_vector[2]).plus(dragForceVector);
          this.ball_transform = this.ball_transform.times(Mat4.translation(position_vector[0], position_vector[1],position_vector[2]));
      }
    }
    create_stadium(context, program_state, model_transform) {
        // existing court creation code...
    
    }
    round_setup(model_transform,program_state,context){
      let randomX = 0.0;
      let randomZ = 0.0;
      let xScalar = 1.0;
      let yScalar = 1.0;
      if(Math.random()<0.5){
        xScalar = -1.0;
      }
      if(Math.random()<0.5){
        yScalar = 1.0;
      }
      randomX = Math.floor(xScalar*Math.random() * 14.0);
      randomZ = Math.floor(yScalar*Math.random() * 20.0);
      this.ball_transform = model_transform.times(Mat4.translation(randomX,0,randomZ));
      this.newRound = false;
      
      //set our camera to ball's new location (work in progress as camera does not align perfectly yet)
      const angle = Math.atan(Math.abs((-11.7 - randomZ)/randomX)); //angle that the ball is facing the hoop
      if(randomX < 0.0){
        const LookAt = Mat4.look_at(vec3(randomX - 3*Math.cos(angle), 1, randomZ + 3*Math.sin(angle)), vec3(0,2.6,-11.7), vec3(0, 1.0, 0));
        program_state.set_camera(LookAt);
        //this.cameraPosition = model_transform.times(Mat4.translation(randomX+2.0*Math.cos(angle), -0.5, randomZ-2.0*Math.sin(angle)))
        //.times(Mat4.translation(-1,-1,0)).times(Mat4.scale(0.8,1,0.8)).times(Mat4.translation(1,1,0));
        const ballLocation = Mat4.look_at(vec3(randomX, 0, randomZ), vec3(0,2.6,-11.7), vec3(0, 1.0, 0))
        this.ball_transform = Mat4.inverse(ballLocation);
        //this.ball_transform = this.ball_transform.times(Mat4.translation(Math.cos(angle),-1,Math.sin(angle)));
        //console.log(Mat4.look_at(vec3(randomX - 4*Math.cos(angle), 1, randomZ + 4*Math.sin(angle)), vec3(0,2.6,-15.7), vec3(0, 1.0, 0)))
      }
      else{
        program_state.set_camera(Mat4.look_at(vec3(randomX + 3*Math.cos(angle), 1, randomZ + 3*Math.sin(angle)), vec3(0,2.6,-11.7), vec3(0, 1, 0)));
        const ballLocation = Mat4.look_at(vec3(randomX,0,randomZ), vec3(0,2.6,-11.7), vec3(0, 1.0, 0));
        this.ball_transform = Mat4.inverse(ballLocation);
      }
      //program_state.set_camera(Mat4.look_at(vec3(randomX - 3*Math.cos(angle), 1, randomZ + 3*Math.sin(angle)), vec3(0,2.6,-11.7), vec3(0, 1, 0)));
    }

    create_court(context,program_state,model_transform, shadow_pass, draw_light_source=false, draw_shadow=false){
        //create the court ground
        //current model_transform is uniform and cube we are using is a unit cube
        //1 unit counts as 1 meter (Subject to change)


        let light_position = this.light_position;
        let light_color = this.light_color;
        const t = program_state.animation_time;

        program_state.draw_shadow = draw_shadow;

        if (draw_light_source && shadow_pass) {
            this.shapes.sphere.draw(context, program_state,
                Mat4.translation(light_position[0], light_position[1], light_position[2]).times(Mat4.scale(.5,.5,.5)),
                this.materials.light_src.override({color: light_color}));
        }


        model_transform = model_transform.times(Mat4.translation(0,-1.5,0));
        let court_transform = model_transform.times(Mat4.scale(17,0.1,30));


        this.shapes.cube.draw(context,program_state, court_transform, this.materials.court_texture_shadow);

        //create the pole holding up the hoop
        let pole_transform = model_transform.times(Mat4.translation(0,3,-29))
            .times(Mat4.scale(0.40,3,0.4));
        this.shapes.cube.draw(context,program_state,pole_transform,this.materials.phong);

        let support_transform = model_transform.times(Mat4.translation(0,5.6,-28)).times(Mat4.scale(0.4,0.4,1));
        this.shapes.cube.draw(context,program_state,support_transform,this.materials.phong);

        let back_board_transform = model_transform.times(Mat4.translation(0,6,-27).times(Mat4.scale(1.8,1.2,0.1)));
        this.shapes.cube.draw(context,program_state,back_board_transform,this.materials.backboard_texture);
        let rim_transform = model_transform.times(Mat4.translation(0,5.15,-26).times(Mat4.scale(1,0.4,1).times(Mat4.rotation(3.14/2,1,0,0))));
        this.shapes.torus.draw(context,program_state,rim_transform,this.materials.rim_texture);


        //create the pole holding up the hoop
        let pole_transform_1 = model_transform.times(Mat4.translation(0,3,29))
        .times(Mat4.scale(0.40,3,0.4));
        this.shapes.cube.draw(context,program_state,pole_transform_1,this.materials.phong);

        let support_transform_1 = model_transform.times(Mat4.translation(0,5.6,28)).times(Mat4.scale(0.4,0.4,1));
        this.shapes.cube.draw(context,program_state,support_transform_1,this.materials.phong);

        let back_board_transform_1 = model_transform.times(Mat4.translation(0,6,27).times(Mat4.scale(1.8,1.2,0.1)));
        this.shapes.cube.draw(context,program_state,back_board_transform_1,this.materials.backboard_texture);
        let rim_transform_1 = model_transform.times(Mat4.translation(0,5.15,26).times(Mat4.scale(1,0.4,1).times(Mat4.rotation(3.14/2,1,0,0))));
        this.shapes.torus.draw(context,program_state,rim_transform_1,this.materials.rim_texture);


        // // left side
        // let left_transform = model_transform.times(Mat4.translation(-17,8,0)).times(Mat4.scale(0.1,8,30));
        // this.shapes.cube.draw(context, program_state, left_transform, this.materials.wall_texture);
        //
        // // right side
        // let right_transform = model_transform.times(Mat4.translation(17,8,0)).times(Mat4.scale(0.1,8,30));
        // this.shapes.cube.draw(context, program_state, right_transform, this.materials.wall_texture);
        //
        //
        // // front side1
        // let front_transform = model_transform.times(Mat4.translation(0,8,-30)).times(Mat4.scale(17,8,0.1));
        // this.shapes.cube.draw(context, program_state, front_transform, this.materials.wall_texture);
        //
        //
        // // back side1
        // let back_transform = model_transform.times(Mat4.translation(0,8,30)).times(Mat4.scale(17,8,0.1));
        // this.shapes.cube.draw(context, program_state, back_transform, this.materials.wall_texture);
        if (this.environments == 0){
            let sphere_transfrom = model_transform.times(Mat4.translation(0,10,0)).times(Mat4.rotation(1.4,0,1,0)).times(Mat4.scale(60,60,60));
            this.shapes.sphere_enclosing.draw(context, program_state, sphere_transfrom, this.materials.indoor_texture);
        }
        else if(this.environments == 1){
            let sphere_transfrom = model_transform.times(Mat4.translation(0,10,0)).times(Mat4.scale(60,60,60));
            this.shapes.sphere_enclosing.draw(context, program_state, sphere_transfrom, this.materials.outdoor_texture);
        }
        else{
            let sphere_transfrom = model_transform.times(Mat4.translation(0,10,0)).times(Mat4.scale(60,60,60));
            this.shapes.sphere_enclosing.draw(context, program_state, sphere_transfrom, this.materials.lake_texture);
        }
    }
    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
        this.key_triggered_button("Change scene", ["c"], () => {this.environments = (this.environments + 1)%3;});
    }
    //this function is what gets done after a shot is made (i.e placing the basketball in random location)
    render_scene(context, program_state, shadow_pass, draw_light_source=false, draw_shadow=false) {
        // shadow_pass: true if this is the second pass that draw the shadow.
        // draw_light_source: true if we want to draw the light source.
        // draw_shadow: true if we want to draw the shadow

        let light_position = this.light_position;
        let light_color = this.light_color;
        const t = program_state.animation_time;

        program_state.draw_shadow = draw_shadow;

        if (draw_light_source && shadow_pass) {
            this.shapes.sphere.draw(context, program_state,
                Mat4.translation(light_position[0], light_position[1], light_position[2]).times(Mat4.scale(.5,.5,.5)),
                this.light_src.override({color: light_color}));
        }

        for (let i of [-1, 1]) { // Spin the 3D model shapes as well.
            const model_transform = Mat4.translation(2 * i, 3, 0)
                .times(Mat4.rotation(t / 1000, -1, 2, 0))
                .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0));
            this.shapes.teapot.draw(context, program_state, model_transform, this.pure);
        }

       /* let model_trans_floor = Mat4.scale(8, 0.1, 5);
        let model_trans_ball_0 = Mat4.translation(0, 1, 0);
        let model_trans_ball_1 = Mat4.translation(5, 1, 0);
        let model_trans_ball_2 = Mat4.translation(-5, 1, 0);
        let model_trans_ball_3 = Mat4.translation(0, 1, 3);
        let model_trans_ball_4 = Mat4.translation(0, 1, -3);
        let model_trans_wall_1 = Mat4.translation(-8, 2 - 0.1, 0).times(Mat4.scale(0.33, 2, 5));
        let model_trans_wall_2 = Mat4.translation(+8, 2 - 0.1, 0).times(Mat4.scale(0.33, 2, 5));
        let model_trans_wall_3 = Mat4.translation(0, 2 - 0.1, -5).times(Mat4.scale(8, 2, 0.33));
        this.shapes.cube.draw(context, program_state, model_trans_floor, shadow_pass? this.floor : this.pure);
        this.shapes.cube.draw(context, program_state, model_trans_wall_1, shadow_pass? this.floor : this.pure);
        this.shapes.cube.draw(context, program_state, model_trans_wall_2, shadow_pass? this.floor : this.pure);
        this.shapes.cube.draw(context, program_state, model_trans_wall_3, shadow_pass? this.floor : this.pure);
        this.shapes.torus.draw(context, program_state, model_trans_ball_0, shadow_pass? this.floor : this.pure);
        this.shapes.sphere.draw(context, program_state, model_trans_ball_1, shadow_pass? this.floor : this.pure);
        this.shapes.sphere.draw(context, program_state, model_trans_ball_2, shadow_pass? this.floor : this.pure);
        this.shapes.sphere.draw(context, program_state, model_trans_ball_3, shadow_pass? this.floor : this.pure);
        this.shapes.sphere.draw(context, program_state, model_trans_ball_4, shadow_pass? this.floor : this.pure);*/
    }

    display(context, program_state) {
        const t = program_state.animation_time;
        this.t = program_state.animation_time / 1000;
        this.dt = program_state.animation_delta_time / 1000;
        const gl = context.context;

        if (!this.init_ok) {
            const ext = gl.getExtension('WEBGL_depth_texture');
            if (!ext) {
                return alert('need WEBGL_depth_texture');  // eslint-disable-line
            }
            this.texture_buffer_init(gl);

            this.init_ok = true;
        }

        if (!context.scratchpad.controls) { //only once per instance of our game
          context.scratchpad.controls = 1;
          //this.children.push(context.scratchpad.controls = new defs.Movement_Controls()); uncomment this if you want camera
          context.scratchpad.controls = 1;
          // Define the global camera and projection matrices, which are stored in program_state.
          let LookAt = Mat4.look_at(vec3(0, 0, 10), vec3(0, 0, 0), vec3(0, 1, 0));
          program_state.set_camera(LookAt);  
          let canvas = context.canvas;
          const mouse_position = (e, rect = canvas.getBoundingClientRect()) =>{
              vec((e.clientX - (rect.left + rect.right) / 2) / ((rect.right - rect.left) / 2),
                  (e.clientY - (rect.bottom + rect.top) / 2) / ((rect.top - rect.bottom) / 2));
            }
            canvas.addEventListener("mousedown", e => {
            e.preventDefault();
            //basically, this will get the initial mouse coordinates
            //kinda unused for now except for getting initial mouse info
            const rect = canvas.getBoundingClientRect();
            console.log("mouse down");
            console.log("e.clientX: " + e.clientX);
            //console.log("e.clientX - rect.left: " + (e.clientX - rect.left));
            console.log("e.clientY: " + e.clientY);
            //console.log("e.clientY - rect.top: " + (e.clientY - rect.top));
            //console.log("mouse_position(e): " + mouse_position(e));
            this.initialMPosition = vec(e.clientX, e.clientY);
            console.log(angle);
          });
          canvas.addEventListener("mouseup",(e)=>{
            //this will get our new coords basically allowing us to calculate the new angle
            //our change in angle based on our new coords
            console.log("mouse up")
            console.log("e.clientX: "+e.clientX);
            console.log("e.clienY: "+e.clientY);
            const changeInX = Math.abs(e.clientX-545.0); //545 is basically the middle of screen(where ball is)
            console.log("changeInX: "+changeInX);
            const changeInY = Math.abs(600.0 - e.clientY); //600 is basically bottom of our screen(where ball is)
            console.log("changeInY: "+changeInY);
            let changeAngle = Math.atan(changeInX/changeInY); //we will only use our change in X to calculate angle 
            if(e.clientX - 545.0 < 0){
              changeAngle = -1.0 * changeAngle;
            }//how much our angle was changed by our user clicking on screen
            //initially basketball is facing where camera is pointing (this is pre-merge info)
            console.log("changeAngle: "+changeAngle);
            const distance = Math.sqrt((changeInX**2)+(changeInY**2));
            this.power = 100.0 * (distance/290.0); //calculate power based on distance mouse is away from ball
            if(this.power > 100.0){
              this.power = 100.0;
            }
            this.power = this.power/100.0; //convert into percent            
            this.angle += changeAngle; //this variable stores the angle gotten from clicking the screen
            this.fired = true; //variable letting us know if the user has fired
          })
          // Define the global camera and projection matrices, which are stored in program_state.
          program_state.set_camera(Mat4.look_at(
              vec3(0, 12, 12),
              vec3(0, 2, 0),
              vec3(0, 1, 0)
          )); // Locate the camera here
        }


        // The position of the light
        this.light_position = Mat4.rotation(1500, 0, 1, 0).times(vec4(3, 15, 0, 1));
        // The color of the light
        this.light_color = color(
            0.667 + Math.sin(t/500) / 3,
            0.667 + Math.sin(t/1500) / 3,
            0.667 + Math.sin(t/3500) / 3,
            1
        );

        // This is a rough target of the light.
        // Although the light is point light, we need a target to set the POV of the light
        this.light_view_target = vec4(0, 0, 0, 1);
        this.light_field_of_view = 130 * Math.PI / 180; // 130 degree

        program_state.lights = [new Light(this.light_position, this.light_color, 2000)];

        // Step 1: set the perspective and camera to the POV of light
        const light_view_mat = Mat4.look_at(
            vec3(this.light_position[0], this.light_position[1], this.light_position[2]),
            vec3(this.light_view_target[0], this.light_view_target[1], this.light_view_target[2]),
            vec3(0, 1, 0), // assume the light to target will have a up dir of +y, maybe need to change according to your case
        );
        const light_proj_mat = Mat4.perspective(this.light_field_of_view, 1, 0.5, 500);
        // Bind the Depth Texture Buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.viewport(0, 0, this.lightDepthTextureSize, this.lightDepthTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Prepare uniforms
        program_state.light_view_mat = light_view_mat;
        program_state.light_proj_mat = light_proj_mat;
        program_state.light_tex_mat = light_proj_mat;
        program_state.view_mat = light_view_mat;
        program_state.projection_transform = light_proj_mat;





        // Step 2: unbind, draw to the canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        program_state.view_mat = program_state.camera_inverse;
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 0.5, 500);




        let model_transform = Mat4.identity();
        //randomize our basketball position (currently commented out to test basketball shooting)
        if (this.newRound){
          this.round_setup(model_transform,program_state);
          
        }
        this.create_court(context,program_state,model_transform);

        // The calculation for the thrown ball has changed slightly we now look at the directional vector rather than the angles
        if(this.t > 3.0 && !this.ball_thrown ) {
            this.ball_thrown = true;// ball is thrown over here
            this.direction_vector = vec3(0,10,-10); // this is the initial directional vector
        }
        //basketball shot at 10 degrees to the right
        if(this.ball_thrown) {
            this.basketball_thrown(); //projectile motion function requires us to store current vert velocity
        }
        this.create_court(context,program_state,model_transform);
        this.shapes.sphere.draw(context, program_state, this.ball_transform.times(Mat4.scale(0.391,0.391,0.391)), this.materials.texture_shadow);

        //this.create_stadium(context, program_state, model_transform);
        }
}


/* Code for mouse controls for camera control (took this out since we don't want user to manually move camera)
if (!context.scratchpad.controls) {
  this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
  context.scratchpad.controls.add_mouse_controls = function(canvas){
    //just here to override the default camera controls
  }
  // Define the global camera and projection matrices, which are stored in program_state.
  program_state.set_camera(Mat4.translation(0, 0, -8));
  let canvas = context.canvas;
  const mouse_position = (e, rect = canvas.getBoundingClientRect()) =>
      vec((e.clientX - (rect.left + rect.right) / 2) / ((rect.right - rect.left) / 2),
          (e.clientY - (rect.bottom + rect.top) / 2) / ((rect.top - rect.bottom) / 2));
  canvas.addEventListener("mousedown", e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect()
      console.log("e.clientX: " + e.clientX);
      console.log("e.clientX - rect.left: " + (e.clientX - rect.left));
      console.log("e.clientY: " + e.clientY);
      console.log("e.clientY - rect.top: " + (e.clientY - rect.top));
      console.log("mouse_position(e): " + mouse_position(e));
      this.my_mouse_down(e, mouse_position(e), context, program_state);
  });
}
*/